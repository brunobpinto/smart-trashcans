#include <Arduino.h>
#include <SPI.h>
#include <MFRC522.h>
#include <SQLiteManager.h>
#include <LittleFS.h>
#include <ArduinoJson.h>
#include <esp_sleep.h>
#include <Preferences.h>

// Define pin connections - RFID
#define SS_PIN   5   // SDA on RC522
#define RST_PIN  2   // RST on RC522

// Define pin connections - LoRaWAN
#define LORA_TX_PIN  18  // Serial1 TX (ESP32-S3 default)
#define LORA_RX_PIN  17  // Serial1 RX (ESP32-S3 default)
#define LORA_BAUD    9600  // Radioenge LoRaWAN default baud rate

// Define pin connections - PIR Motion Sensor (HC-SR501)
#define PIR_PIN      4   // PIR data output (RTC-capable for wake-up)

// Define pin connections - Ultrasound Distance Sensor (HC-SR04)
#define TRIG_PIN     6   // Ultrasound trigger
#define ECHO_PIN     7   // Ultrasound echo

// Trashcan configuration
#define TRASHCAN_DEPTH_CM  30.0  // Distance from sensor to bottom when empty (adjust to your trashcan)
#define TRASHCAN_NAME "LX-001" // Name identifier for this trashcan

// Deep sleep configuration
#define DEEP_SLEEP_TIMER_US  180000000ULL   // 3 minutes in microseconds (180 * 1000 * 1000)
#define ACTIVE_WINDOW_MS     30000          // Stay awake for 30 seconds after wake-up

MFRC522 rfid(SS_PIN, RST_PIN); // Create MFRC522 instance
SQLiteManager database;
HardwareSerial LoRaSerial(1); // Serial1 for LoRaWAN

// LoRaWAN state management
bool lorawan_joined = false;

// Persistent storage for usage counter (survives deep sleep)
Preferences preferences;
int usage_counter = 0;

// Flag to track if worker was authenticated this wake cycle
bool worker_authenticated = false;

// Function to format RFID UID as string (e.g., "21 47 C2 4C")
String format_rfid(byte *uid, byte size) {
  String rfidString = "";
  for (byte i = 0; i < size; i++) {
    if (i > 0) rfidString += " ";
    if (uid[i] < 0x10) rfidString += "0";
    rfidString += String(uid[i], HEX);
  }
  rfidString.toUpperCase();
  return rfidString;
}

// ============================================
// Persistent Counter Functions
// ============================================

// Increment usage counter and save to persistent storage
void increment_counter() {
  usage_counter++;
  preferences.putInt("usage_count", usage_counter);
  Serial.print("📊 Usage counter incremented to: ");
  Serial.println(usage_counter);
}

// Clear usage counter (after sending periodic report)
void clear_counter() {
  usage_counter = 0;
  preferences.putInt("usage_count", 0);
  Serial.println("📊 Usage counter cleared to 0");
}

// Forward declaration for process_downlink_message
void process_downlink_message(String hexData, int port);

// Function to check response for RX: messages and process them
void check_response_for_downlink(String& response) {
  // Look for RX: pattern in response
  int rxIndex = response.indexOf("RX:");
  if (rxIndex >= 0) {
    Serial.println("\n📩 ===== Downlink Found in Response =====");
    
    // Extract the RX line - find the end (newline or end of string)
    int lineEnd = response.indexOf('\n', rxIndex);
    if (lineEnd < 0) lineEnd = response.indexOf('\r', rxIndex);
    if (lineEnd < 0) lineEnd = response.length();
    
    String rxLine = response.substring(rxIndex, lineEnd);
    rxLine.trim();
    Serial.print("RX Line: ");
    Serial.println(rxLine);
    
    // Parse format: RX:HEXDATA:PORT:RSSI:SNR
    int firstColon = rxLine.indexOf(':');
    int secondColon = rxLine.indexOf(':', firstColon + 1);
    int thirdColon = rxLine.indexOf(':', secondColon + 1);
    int fourthColon = rxLine.indexOf(':', thirdColon + 1);
    
    if (secondColon > 0) {
      // Extract hex data (between first and second colon)
      String hexData = rxLine.substring(firstColon + 1, secondColon);
      
      // Extract port
      int port = 0;
      if (thirdColon > 0) {
        String portStr = rxLine.substring(secondColon + 1, thirdColon);
        port = portStr.toInt();
      }
      
      // Extract rssi, snr for logging
      String rssi = "";
      String snr = "";
      if (fourthColon > 0) {
        rssi = rxLine.substring(thirdColon + 1, fourthColon);
        snr = rxLine.substring(fourthColon + 1);
      }
      
      // Display info
      Serial.print("Hex Data: ");
      for (unsigned int i = 0; i < hexData.length(); i += 2) {
        Serial.print(hexData.substring(i, i + 2));
        if (i + 2 < hexData.length()) Serial.print(" ");
      }
      Serial.println();
      Serial.print("Port: ");
      Serial.println(port);
      if (rssi.length() > 0) {
        Serial.print("RSSI: ");
        Serial.print(rssi);
        Serial.println(" dBm");
      }
      if (snr.length() > 0) {
        Serial.print("SNR: ");
        Serial.println(snr);
      }
      Serial.println("========================================\n");
      
      // Process the downlink message
      process_downlink_message(hexData, port);
    }
  }
}

// Function to send AT command to LoRaWAN and check for OK response
// Also captures and processes any RX: (downlink) messages in the response
bool send_at_command(const char* command, unsigned long timeout = 2000) {
  // Clear any pending data
  while (LoRaSerial.available()) {
    LoRaSerial.read();
  }
  
  // Send AT command
  LoRaSerial.println(command);
  Serial.print("Sent to LoRaWAN: ");
  Serial.println(command);
  
  // Wait for response
  unsigned long start = millis();
  String response = "";
  bool foundOK = false;
  unsigned long okFoundTime = 0;
  
  // Additional wait time after OK to capture any RX: message (10 seconds)
  const unsigned long POST_OK_WAIT_MS = 10000;
  
  while (true) {
    // Check timeout conditions
    if (!foundOK && (millis() - start >= timeout)) {
      // Timed out waiting for OK
      break;
    }
    if (foundOK && (millis() - okFoundTime >= POST_OK_WAIT_MS)) {
      // Found OK and waited additional time for RX
      break;
    }
    
    if (LoRaSerial.available()) {
      char c = LoRaSerial.read();
      response += c;
      Serial.print(c); // Echo in real-time for debugging
      
      // Check if we received "OK" (and haven't found it yet)
      if (!foundOK && response.indexOf("OK") != -1) {
        foundOK = true;
        okFoundTime = millis();
        Serial.println("\n[OK received, waiting for potential RX...]");
      }
    }
  }
  
  Serial.println(); // New line after response
  
  // Print full response for debugging
  Serial.print("Full Response: [");
  Serial.print(response);
  Serial.println("]");
  
  // Check for and process any RX: messages in the response
  check_response_for_downlink(response);
  
  if (!foundOK) {
    Serial.println("✗ No OK received (timeout)");
    return false;
  }
  
  return true;
}

// Function to send data via LoRaWAN using AT+SENDB command
bool send_lorawan_data(byte* data, int length, int port = 1) {
  Serial.println("\n=== Sending Data via LoRaWAN ===");
  Serial.print("Data length: ");
  Serial.print(length);
  Serial.print(" bytes on port ");
  Serial.println(port);
  
  // Convert bytes to hex string
  String hexData = "";
  for (int i = 0; i < length; i++) {
    if (data[i] < 0x10) hexData += "0";
    hexData += String(data[i], HEX);
  }
  hexData.toUpperCase();
  
  Serial.print("Hex data: ");
  Serial.println(hexData);
  
  // Construct AT+SENDB command
  String command = "AT+SENDB=" + String(port) + ":" + hexData;
  
  // Send the command
  Serial.print("Sending command: ");
  Serial.println(command);
  
  bool success = send_at_command(command.c_str(), 5000); // 5 second timeout
  
  if (success) {
    Serial.println("✓ Data queued for transmission");
  } else {
    Serial.println("✗ Failed to queue data for transmission");
  }
  
  Serial.println("====================================\n");
  return success;
}

// Function to test LoRaWAN connectivity
bool test_lorawan_module() {
  Serial.println("\n=== Testing LoRaWAN Module ===");
  
  // Test basic AT command
  Serial.println("Testing AT command...");
  bool at_ok = send_at_command("AT");
  
  if (at_ok) {
    Serial.println("✓ LoRaWAN module is responding correctly!");
  } else {
    Serial.println("✗ LoRaWAN module is not responding!");
  }
  
  Serial.println("================================\n");
  return at_ok;
}

// Function to join LoRaWAN network in OTAA mode
bool join_lorawan_network(int max_retries = 3, unsigned long timeout = 60000) {
  Serial.println("\n=== Joining LoRaWAN Network (OTAA) ===");
  
  for (int attempt = 1; attempt <= max_retries; attempt++) {
    Serial.print("Join attempt ");
    Serial.print(attempt);
    Serial.print("/");
    Serial.println(max_retries);
    
    // Clear any pending data thoroughly
    while (LoRaSerial.available()) {
      LoRaSerial.read();
    }
    
    // Give module time to settle after clearing buffer
    delay(500);
    
    // Send JOIN command
    LoRaSerial.println("AT+JOIN");
    Serial.println("Sent: AT+JOIN");
    
    // Wait for join response (OTAA can take 30-60 seconds)
    unsigned long start = millis();
    String response = "";
    bool joined = false;
    
    Serial.println("Waiting for join confirmation...");
    
    while (millis() - start < timeout) {
      if (LoRaSerial.available()) {
        char c = LoRaSerial.read();
        response += c;
        Serial.print(c); // Echo response in real-time
        
        // Check for success indicators
        if (response.indexOf("OK") != -1 || 
            response.indexOf("JOINED") != -1 || 
            response.indexOf("Join Success") != -1) {
          joined = true;
          break;
        }
        
        // Check for failure indicators
        if (response.indexOf("ERROR") != -1 || 
            response.indexOf("Join Failed") != -1) {
          break;
        }
      }
      
      // Give some feedback every 10 seconds
      if ((millis() - start) % 10000 == 0) {
        Serial.print(".");
      }
    }
    
    Serial.println(); // New line after response
    
    if (joined) {
      Serial.println("✓ Successfully joined LoRaWAN network!");
      Serial.println("=========================================\n");
      return true;
    } else {
      Serial.print("✗ Join attempt ");
      Serial.print(attempt);
      Serial.println(" failed");
      
      if (attempt < max_retries) {
        Serial.println("Retrying in 5 seconds...");
        delay(5000);
      }
    }
  }
  
  Serial.println("✗ Failed to join LoRaWAN network after all attempts");
  Serial.println("=========================================\n");
  return false;
}

// Function to check for incoming LoRaWAN messages
void check_incoming_lorawan() {
  static String rxBuffer = "";
  
  // Read all available characters from LoRa serial
  while (LoRaSerial.available()) {
    char c = LoRaSerial.read();
    
    // Accumulate characters
    rxBuffer += c;
    
    // Check if we have a complete line (ends with newline)
    if (c == '\n' || c == '\r') {
      // Trim whitespace
      rxBuffer.trim();
      
      // Check if this is an RX message (incoming downlink)
      if (rxBuffer.startsWith("RX:")) {
        Serial.println("\n📩 ===== LoRaWAN Message Received =====");
        
        // Parse format: RX:HEXDATA:PORT:RSSI:SNR
        int firstColon = rxBuffer.indexOf(':');
        int secondColon = rxBuffer.indexOf(':', firstColon + 1);
        int thirdColon = rxBuffer.indexOf(':', secondColon + 1);
        int fourthColon = rxBuffer.indexOf(':', thirdColon + 1);
        
        if (secondColon > 0) {
          // Extract hex data (between first and second colon)
          String hexData = rxBuffer.substring(firstColon + 1, secondColon);
          
          // Extract port, rssi, snr if available
          String port = "";
          String rssi = "";
          String snr = "";
          
          if (thirdColon > 0) {
            port = rxBuffer.substring(secondColon + 1, thirdColon);
          }
          if (fourthColon > 0) {
            rssi = rxBuffer.substring(thirdColon + 1, fourthColon);
            snr = rxBuffer.substring(fourthColon + 1);
          }
          
          // Display hex data with spaces
          Serial.print("Hex Data: ");
          for (int i = 0; i < hexData.length(); i += 2) {
            Serial.print(hexData.substring(i, i + 2));
            if (i + 2 < hexData.length()) Serial.print(" ");
          }
          Serial.println();
          
          // Convert hex string to bytes and display
          Serial.print("Raw Bytes: [");
          for (int i = 0; i < hexData.length(); i += 2) {
            String byteStr = hexData.substring(i, i + 2);
            int byteValue = strtol(byteStr.c_str(), NULL, 16);
            Serial.print(byteValue);
            if (i + 2 < hexData.length()) Serial.print(", ");
          }
          Serial.println("]");
          
          // Display metadata
          if (port.length() > 0) {
            Serial.print("Port: ");
            Serial.println(port);
          }
          if (rssi.length() > 0) {
            Serial.print("RSSI: ");
            Serial.print(rssi);
            Serial.println(" dBm");
          }
          if (snr.length() > 0) {
            Serial.print("SNR: ");
            Serial.println(snr);
          }
          
          Serial.println("========================================\n");
        }
      }
      
      // Clear buffer for next message
      rxBuffer = "";
    }
    
    // Prevent buffer overflow
    if (rxBuffer.length() > 200) {
      rxBuffer = "";
    }
  }
}

// ============================================
// PIR and Ultrasound Sensor Functions
// ============================================

// Function to read PIR motion sensor
// Returns true if motion is detected
bool read_pir() {
  return digitalRead(PIR_PIN) == HIGH;
}

// Function to read ultrasound distance sensor
// Returns distance in centimeters, or -1 if measurement failed
float read_ultrasound() {
  // Clear the trigger pin
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  
  // Send 10 microsecond pulse to trigger
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);
  
  // Read the echo pin - returns pulse duration in microseconds
  // Timeout after 30ms (max range ~5m)
  long duration = pulseIn(ECHO_PIN, HIGH, 30000);
  
  // Check for timeout (no echo received)
  if (duration == 0) {
    return -1.0;
  }
  
  // Calculate distance in cm
  // Speed of sound = 343 m/s = 0.0343 cm/μs
  // Distance = (duration * 0.0343) / 2 (divide by 2 for round trip)
  float distance = (duration * 0.0343) / 2.0;
  
  return distance;
}

// Function to calculate trash fill level percentage from a given distance
// Pass the distance reading to avoid multiple ultrasound polls (HC-SR04 needs ~60ms between readings)
// Returns percentage (0-100%), or -1 if distance is invalid
float get_fill_percentage(float distance) {
  if (distance < 0) {
    return -1.0; // Invalid distance
  }
  
  // Calculate fill percentage
  // When empty: distance = TRASHCAN_DEPTH_CM, fill = 0%
  // When full: distance = 0, fill = 100%
  float fill = ((TRASHCAN_DEPTH_CM - distance) / TRASHCAN_DEPTH_CM) * 100.0;
  
  // Clamp to 0-100% range
  if (fill < 0) fill = 0;
  if (fill > 100) fill = 100;
  
  return fill;
}

// Function to print all sensor readings
void print_sensor_readings() {
  Serial.println("\n========= Sensor Readings =========");
  
  // Read PIR
  bool motion = read_pir();
  Serial.print("🚶 PIR Motion:    ");
  Serial.println(motion ? "DETECTED!" : "No motion");
  
  // Read ultrasound (only once - HC-SR04 needs ~60ms between readings)
  float distance = read_ultrasound();
  Serial.print("📏 Distance:      ");
  if (distance < 0) {
    Serial.println("Error (no echo)");
  } else {
    Serial.print(distance, 1);
    Serial.println(" cm");
  }
  
  // Calculate fill level from the already-read distance
  float fill = get_fill_percentage(distance);
  Serial.print("🗑️  Fill Level:    ");
  if (fill < 0) {
    Serial.println("Error");
  } else {
    Serial.print(fill, 1);
    Serial.println("%");
    
    // Visual fill bar
    Serial.print("   [");
    int bars = (int)(fill / 5); // 20 character bar
    for (int i = 0; i < 20; i++) {
      if (i < bars) Serial.print("█");
      else Serial.print("░");
    }
    Serial.println("]");
  }
  
  Serial.println("===================================\n");
}

// ============================================
// Deep Sleep Functions
// ============================================

// Global variable to track wake-up time for active window
unsigned long wake_up_time = 0;

// Function to get wake-up reason as string
String get_wakeup_reason_string(esp_sleep_wakeup_cause_t wakeup_reason) {
  switch(wakeup_reason) {
    case ESP_SLEEP_WAKEUP_EXT0:     return "EXT0 (PIR Motion)";
    case ESP_SLEEP_WAKEUP_EXT1:     return "EXT1";
    case ESP_SLEEP_WAKEUP_TIMER:    return "Timer (1 hour)";
    case ESP_SLEEP_WAKEUP_TOUCHPAD: return "Touchpad";
    case ESP_SLEEP_WAKEUP_ULP:      return "ULP";
    case ESP_SLEEP_WAKEUP_GPIO:     return "GPIO";
    case ESP_SLEEP_WAKEUP_UART:     return "UART";
    default:                        return "Power-on/Reset";
  }
}

// Function to handle wake-up reason - called at beginning of setup()
// Returns the wake-up cause for further processing
esp_sleep_wakeup_cause_t handle_wakeup_reason() {
  esp_sleep_wakeup_cause_t wakeup_reason = esp_sleep_get_wakeup_cause();
  
  Serial.println("\n🔔 ========== WAKE-UP EVENT ==========");
  Serial.print("Wake-up reason: ");
  Serial.println(get_wakeup_reason_string(wakeup_reason));
  
  switch(wakeup_reason) {
    case ESP_SLEEP_WAKEUP_EXT0:
      // PIR motion detected wake-up
      Serial.println("🚶 Motion detected by PIR sensor!");
      Serial.println("Someone is approaching the trashcan...");
      break;
      
    case ESP_SLEEP_WAKEUP_TIMER:
      // Timer wake-up (1 hour elapsed)
      Serial.println("⏰ Timer wake-up (1 hour periodic check)");
      Serial.println("Will send sensor data via LoRaWAN...");
      break;
      
    default:
      // Power-on or reset
      Serial.println("🔌 Initial power-on or manual reset");
      Serial.println("Full system initialization required...");
      break;
  }
  
  Serial.println("======================================\n");
  
  return wakeup_reason;
}

// Operation ID constants for LoRaWAN uplink messages
#define OP_WORKER_CLEANUP  0x01
#define OP_HOURLY_REPORT   0x02

// Operation ID constants for LoRaWAN downlink messages
#define DL_OP_INSERT_USER  0x01
#define DL_OP_DELETE_USER  0x02
#define DL_ROLE_WORKER     0x01
#define DL_ROLE_ADMIN      0x02

// Downlink wait configuration
#define DOWNLINK_WAIT_MS   15000   // Wait 15 seconds after uplink for potential downlink

// ============================================
// Downlink Processing Functions
// ============================================

// Insert user into local database from downlink command
bool insert_user_from_downlink(String rfid_tag_id, String role) {
  Serial.println("\n👤 ===== INSERTING USER FROM DOWNLINK =====");
  Serial.print("RFID Tag: ");
  Serial.println(rfid_tag_id);
  Serial.print("Role: ");
  Serial.println(role);
  
  try {
    database.execute(
      "INSERT OR REPLACE INTO user (rfid_tag_id, role) VALUES(?, ?);",
      rfid_tag_id, role
    );
    Serial.println("✓ User inserted/updated successfully!");
    Serial.println("===========================================\n");
    return true;
  } catch (const std::exception &e) {
    Serial.print("✗ Database error inserting user: ");
    Serial.println(e.what());
    Serial.println("===========================================\n");
    return false;
  }
}

// Delete user from local database from downlink command
bool delete_user_from_downlink(String rfid_tag_id) {
  Serial.println("\n🗑️  ===== DELETING USER FROM DOWNLINK =====");
  Serial.print("RFID Tag: ");
  Serial.println(rfid_tag_id);
  
  try {
    database.execute(
      "DELETE FROM user WHERE rfid_tag_id = ?;",
      rfid_tag_id
    );
    Serial.println("✓ User deleted successfully (if existed)!");
    Serial.println("==========================================\n");
    return true;
  } catch (const std::exception &e) {
    Serial.print("✗ Database error deleting user: ");
    Serial.println(e.what());
    Serial.println("==========================================\n");
    return false;
  }
}

// Process a downlink message for user management
// Format: [OP (1)] [RFID (4)] [ROLE (1, INSERT only)]
// INSERT (0x01): 6 bytes total, DELETE (0x02): 5 bytes total
void process_downlink_message(String hexData, int port) {
  Serial.println("\n🔽 ===== PROCESSING DOWNLINK MESSAGE =====");
  Serial.print("Port: ");
  Serial.println(port);
  Serial.print("Hex Data: ");
  Serial.println(hexData);
  
  // Calculate byte length (2 hex chars = 1 byte)
  int byteLength = hexData.length() / 2;
  Serial.print("Message length: ");
  Serial.print(byteLength);
  Serial.println(" bytes");
  
  // Convert hex string to byte array
  byte data[10];  // Max expected size
  for (int i = 0; i < byteLength && i < 10; i++) {
    String byteStr = hexData.substring(i * 2, i * 2 + 2);
    data[i] = (byte)strtol(byteStr.c_str(), NULL, 16);
  }
  
  // Extract operation code
  byte operation = data[0];
  Serial.print("Operation: 0x");
  if (operation < 0x10) Serial.print("0");
  Serial.println(operation, HEX);
  
  // Handle based on operation
  if (operation == DL_OP_INSERT_USER) {
    // INSERT: Expect 6 bytes [OP(1) + RFID(4) + ROLE(1)]
    if (byteLength != 6) {
      Serial.print("✗ Invalid message length for INSERT: expected 6, got ");
      Serial.println(byteLength);
      Serial.println("==========================================\n");
      return;
    }
    
    // Extract RFID (bytes 1-4) and format as spaced hex string
    String rfid_tag = "";
    for (int i = 1; i <= 4; i++) {
      if (i > 1) rfid_tag += " ";
      if (data[i] < 0x10) rfid_tag += "0";
      rfid_tag += String(data[i], HEX);
    }
    rfid_tag.toUpperCase();
    
    // Extract role byte and convert to string
    byte roleByte = data[5];
    String role = "";
    if (roleByte == DL_ROLE_WORKER) {
      role = "WORKER";
    } else if (roleByte == DL_ROLE_ADMIN) {
      role = "ADMIN";
    } else {
      Serial.print("✗ Invalid role byte: 0x");
      if (roleByte < 0x10) Serial.print("0");
      Serial.println(roleByte, HEX);
      Serial.println("  Expected: 0x01 (WORKER) or 0x02 (ADMIN)");
      Serial.println("==========================================\n");
      return;
    }
    
    Serial.println("--- INSERT Operation ---");
    Serial.print("  RFID: ");
    Serial.println(rfid_tag);
    Serial.print("  Role: ");
    Serial.println(role);
    
    // Execute database insert
    insert_user_from_downlink(rfid_tag, role);
    
  } else if (operation == DL_OP_DELETE_USER) {
    // DELETE: Expect 5 bytes [OP(1) + RFID(4)]
    if (byteLength != 5) {
      Serial.print("✗ Invalid message length for DELETE: expected 5, got ");
      Serial.println(byteLength);
      Serial.println("==========================================\n");
      return;
    }
    
    // Extract RFID (bytes 1-4) and format as spaced hex string
    String rfid_tag = "";
    for (int i = 1; i <= 4; i++) {
      if (i > 1) rfid_tag += " ";
      if (data[i] < 0x10) rfid_tag += "0";
      rfid_tag += String(data[i], HEX);
    }
    rfid_tag.toUpperCase();
    
    Serial.println("--- DELETE Operation ---");
    Serial.print("  RFID: ");
    Serial.println(rfid_tag);
    
    // Execute database delete
    delete_user_from_downlink(rfid_tag);
    
  } else {
    Serial.print("✗ Unknown operation code: 0x");
    if (operation < 0x10) Serial.print("0");
    Serial.println(operation, HEX);
    Serial.println("  Expected: 0x01 (INSERT) or 0x02 (DELETE)");
    Serial.println("==========================================\n");
    return;
  }
  
  Serial.println("==========================================\n");
}

// Forward declaration for check_incoming_lorawan_blocking
void check_incoming_lorawan_blocking();

// Wait for potential downlink messages after sending an uplink
// This gives the network server time to queue and send pending downlinks
void wait_for_downlink() {
  Serial.println("\n⏳ Waiting for potential downlink messages...");
  Serial.print("Wait time: ");
  Serial.print(DOWNLINK_WAIT_MS / 1000.0, 1);
  Serial.println(" seconds");
  
  unsigned long start = millis();
  while (millis() - start < DOWNLINK_WAIT_MS) {
    // Check for incoming messages while waiting
    check_incoming_lorawan_blocking();
    delay(10);  // Small delay to prevent busy-waiting
  }
  
  Serial.println("✓ Downlink wait complete\n");
}

// Blocking version of check_incoming_lorawan that processes messages immediately
// Used during the downlink wait window
void check_incoming_lorawan_blocking() {
  static String rxBuffer = "";
  
  // Read all available characters from LoRa serial
  while (LoRaSerial.available()) {
    char c = LoRaSerial.read();
    
    // Accumulate characters
    rxBuffer += c;
    
    // Check if we have a complete line (ends with newline)
    if (c == '\n' || c == '\r') {
      // Trim whitespace
      rxBuffer.trim();
      
      // Check if this is an RX message (incoming downlink)
      if (rxBuffer.startsWith("RX:")) {
        Serial.println("\n📩 ===== LoRaWAN Message Received =====");
        
        // Parse format: RX:HEXDATA:PORT:RSSI:SNR
        int firstColon = rxBuffer.indexOf(':');
        int secondColon = rxBuffer.indexOf(':', firstColon + 1);
        int thirdColon = rxBuffer.indexOf(':', secondColon + 1);
        int fourthColon = rxBuffer.indexOf(':', thirdColon + 1);
        
        if (secondColon > 0) {
          // Extract hex data (between first and second colon)
          String hexData = rxBuffer.substring(firstColon + 1, secondColon);
          
          // Extract port, rssi, snr if available
          String portStr = "";
          String rssi = "";
          String snr = "";
          int port = 0;
          
          if (thirdColon > 0) {
            portStr = rxBuffer.substring(secondColon + 1, thirdColon);
            port = portStr.toInt();
          }
          if (fourthColon > 0) {
            rssi = rxBuffer.substring(thirdColon + 1, fourthColon);
            snr = rxBuffer.substring(fourthColon + 1);
          }
          
          // Display hex data with spaces
          Serial.print("Hex Data: ");
          for (unsigned int i = 0; i < hexData.length(); i += 2) {
            Serial.print(hexData.substring(i, i + 2));
            if (i + 2 < hexData.length()) Serial.print(" ");
          }
          Serial.println();
          
          // Display metadata
          if (portStr.length() > 0) {
            Serial.print("Port: ");
            Serial.println(portStr);
          }
          if (rssi.length() > 0) {
            Serial.print("RSSI: ");
            Serial.print(rssi);
            Serial.println(" dBm");
          }
          if (snr.length() > 0) {
            Serial.print("SNR: ");
            Serial.println(snr);
          }
          
          Serial.println("========================================\n");
          
          // Process the downlink message if on correct port
          process_downlink_message(hexData, port);
        }
      }
      
      // Clear buffer for next message
      rxBuffer = "";
    }
    
    // Prevent buffer overflow
    if (rxBuffer.length() > 200) {
      rxBuffer = "";
    }
  }
}

// Send hourly report via LoRaWAN (Operation 02)
// Format: [OP_ID (1)] [TRASHCAN_NAME (6)] [FILL_PCT (1)] [USAGE_COUNT (1)] = 9 bytes
bool send_periodic_lorawan_data() {
  Serial.println("\n📡 ========== PERIODIC DATA SEND ==========");
  Serial.println("Timer wake-up: Sending periodic report via LoRaWAN");
  
  // Read current sensor values
  float distance = read_ultrasound();
  float fill_percentage = get_fill_percentage(distance);
  
  // Convert to bytes (clamp to valid ranges)
  byte fill_pct_byte = (fill_percentage >= 0) ? (byte)fill_percentage : 0;
  if (fill_pct_byte > 100) fill_pct_byte = 100;
  
  // Cap usage counter at 255 (1 byte max)
  byte usage_count_byte = (usage_counter > 255) ? 255 : (byte)usage_counter;
  
  Serial.println("\n--- Periodic Report Data ---");
  Serial.print("Trashcan Name: ");
  Serial.println(TRASHCAN_NAME);
  Serial.print("Fill Level: ");
  Serial.print(fill_pct_byte);
  Serial.println("%");
  Serial.print("Usage count since last report: ");
  Serial.println(usage_count_byte);
  
  // Build the message: Operation ID + Trashcan Name (6 bytes) + Fill % + Usage Count
  byte message[9];
  message[0] = OP_HOURLY_REPORT;   // Operation ID: 0x02
  
  // Copy 6-character trashcan name as bytes
  for (int i = 0; i < 6; i++) {
    message[1 + i] = (byte)TRASHCAN_NAME[i];
  }
  
  message[7] = fill_pct_byte;      // Fill percentage (0-100)
  message[8] = usage_count_byte;   // Usage counter (0-255)
  
  // Print what we're sending
  Serial.print("Message bytes: ");
  for (int i = 0; i < 9; i++) {
    if (message[i] < 0x10) Serial.print("0");
    Serial.print(message[i], HEX);
    Serial.print(" ");
  }
  Serial.println();
  
  Serial.print("  - Operation: Hourly Report (0x02)\n");
  Serial.print("  - Trashcan Name: ");
  Serial.print(TRASHCAN_NAME);
  Serial.print(" (");
  for (int i = 0; i < 6; i++) {
    if (message[1 + i] < 0x10) Serial.print("0");
    Serial.print(message[1 + i], HEX);
    if (i < 5) Serial.print(" ");
  }
  Serial.println(")");
  Serial.print("  - Fill %: ");
  Serial.print(fill_pct_byte);
  Serial.print(" (0x");
  if (fill_pct_byte < 0x10) Serial.print("0");
  Serial.print(fill_pct_byte, HEX);
  Serial.println(")");
  Serial.print("  - Usage count: ");
  Serial.print(usage_count_byte);
  Serial.print(" (0x");
  if (usage_count_byte < 0x10) Serial.print("0");
  Serial.print(usage_count_byte, HEX);
  Serial.println(")");
  
  // Send via LoRaWAN
  bool success = send_lorawan_data(message, 9, 1);
  
  if (success) {
    Serial.println("✓ Periodic report sent successfully");
    // Only clear counter after successful send
    clear_counter();
    
    // Wait for potential downlink messages (user management commands)
    wait_for_downlink();
  } else {
    Serial.println("✗ Failed to send periodic report");
    Serial.println("⚠ Counter NOT cleared - will retry next hour");
  }
  
  Serial.println("============================================\n");
  return success;
}

// Send worker cleanup notification via LoRaWAN (Operation 01)
// Format: [OP_ID (1)] [TRASHCAN_NAME (6)] [RFID_UID (4)] = 11 bytes
bool send_emptied_notification(byte* uid, byte uid_size) {
  Serial.println("\n📡 ========== WORKER EMPTIED NOTIFICATION ==========");
  
  // Build the message: Operation ID + Trashcan Name (6 bytes) + RFID UID (4 bytes)
  byte message[11];
  message[0] = OP_WORKER_CLEANUP;  // Operation ID: 0x01
  
  // Copy 6-character trashcan name as bytes
  for (int i = 0; i < 6; i++) {
    message[1 + i] = (byte)TRASHCAN_NAME[i];
  }
  
  // Copy RFID UID bytes (assuming 4 bytes)
  for (int i = 0; i < 4 && i < uid_size; i++) {
    message[7 + i] = uid[i];
  }
  
  // Print what we're sending
  Serial.print("Message bytes: ");
  for (int i = 0; i < 11; i++) {
    if (message[i] < 0x10) Serial.print("0");
    Serial.print(message[i], HEX);
    Serial.print(" ");
  }
  Serial.println();
  
  Serial.print("  - Operation: Worker Cleanup (0x01)\n");
  Serial.print("  - Trashcan Name: ");
  Serial.print(TRASHCAN_NAME);
  Serial.print(" (");
  for (int i = 0; i < 6; i++) {
    if (message[1 + i] < 0x10) Serial.print("0");
    Serial.print(message[1 + i], HEX);
    if (i < 5) Serial.print(" ");
  }
  Serial.println(")");
  Serial.print("  - Worker RFID: ");
  for (int i = 0; i < 4; i++) {
    if (uid[i] < 0x10) Serial.print("0");
    Serial.print(uid[i], HEX);
    if (i < 3) Serial.print(" ");
  }
  Serial.println();
  
  // Send via LoRaWAN
  bool success = send_lorawan_data(message, 11, 1);
  
  if (success) {
    Serial.println("✓ Worker cleanup notification sent successfully");
    
    // Wait for potential downlink messages (user management commands)
    wait_for_downlink();
  } else {
    Serial.println("✗ Failed to send worker cleanup notification");
  }
  
  Serial.println("====================================================\n");
  return success;
}

// Function to configure deep sleep wake-up sources
void configure_deep_sleep() {
  Serial.println("\n💤 Configuring deep sleep wake-up sources...");
  
  // Configure EXT0 wake-up on PIR pin (GPIO 4)
  // Wake up when PIR goes HIGH (motion detected)
  esp_err_t ext0_result = esp_sleep_enable_ext0_wakeup(GPIO_NUM_4, 1); // 1 = HIGH level
  if (ext0_result == ESP_OK) {
    Serial.println("✓ EXT0 wake-up configured (PIR on GPIO 4, trigger on HIGH)");
  } else {
    Serial.print("✗ EXT0 wake-up configuration failed: ");
    Serial.println(ext0_result);
  }
  
  // Configure timer wake-up (1 hour)
  esp_err_t timer_result = esp_sleep_enable_timer_wakeup(DEEP_SLEEP_TIMER_US);
  if (timer_result == ESP_OK) {
    Serial.println("✓ Timer wake-up configured (1 hour interval)");
  } else {
    Serial.print("✗ Timer wake-up configuration failed: ");
    Serial.println(timer_result);
  }
  
  Serial.println("Deep sleep configuration complete.\n");
}

// Function to enter deep sleep
void enter_deep_sleep() {
  Serial.println("\n💤 ========== ENTERING DEEP SLEEP ==========");
  Serial.println("Wake-up sources:");
  Serial.println("  - PIR motion detection (GPIO 4)");
  Serial.println("  - Timer (1 hour)");
  Serial.println("Good night! 😴");
  Serial.println("=============================================\n");
  
  // Flush serial buffer before sleep
  Serial.flush();
  
  // Small delay to ensure serial output is complete
  delay(100);
  
  // Enter deep sleep (will not return - CPU resets on wake-up)
  esp_deep_sleep_start();
}

// Function to check if RFID is authorized
bool check_access(String rfid_tag_id) {
  try {
    JsonDocument result = database.execute(
      "SELECT id, role FROM user WHERE rfid_tag_id = ?;",
      rfid_tag_id
    );

    // Check if any rows were returned
    if (result.size() > 0 && result[0].size() > 0) {
      // User found - access role by column name (SQLiteManager returns JSON objects)
      String role = result[0]["role"].as<String>();
      Serial.print("✓ ACCESS GRANTED - Role: ");
      Serial.println(role);
      return true;
    } else {
      // User not found
      Serial.println("✗ ACCESS DENIED - Unknown RFID tag");
      return false;
    }
  } catch (const std::exception &e) {
    Serial.print("Database error: ");
    Serial.println(e.what());
    return false;
  }
}

// Global variable to store wake-up reason
esp_sleep_wakeup_cause_t wakeup_reason;

void setup() {
  Serial.begin(115200);
  delay(500);
  
  // Handle wake-up reason first (before any initialization)
  wakeup_reason = handle_wakeup_reason();
  
  // Record wake-up time for active window tracking
  wake_up_time = millis();
  
  // Initialize persistent storage and load usage counter
  Serial.println("Loading persistent storage...");
  preferences.begin("trashcan", false);  // namespace "trashcan", read-write mode
  usage_counter = preferences.getInt("usage_count", 0);  // default 0
  Serial.print("📊 Usage counter loaded: ");
  Serial.println(usage_counter);
  
  Serial.println("\n\n=== System Initialization ===");

  // Initialize LoRaWAN Serial (Serial1)
  Serial.println("Initializing LoRaWAN module...");
  LoRaSerial.begin(LORA_BAUD, SERIAL_8N1, LORA_RX_PIN, LORA_TX_PIN);
  delay(3000); // Give LoRaWAN time to fully boot and initialize
  
  // Test LoRaWAN connectivity
  if (test_lorawan_module()) {
    Serial.println("LoRaWAN module initialized successfully!");
  } else {
    Serial.println("Warning: LoRaWAN module not responding properly");
  }

  // Join LoRaWAN network in OTAA mode
  lorawan_joined = join_lorawan_network(3, 60000); // 3 attempts, 60 seconds timeout each
  
  if (!lorawan_joined) {
    Serial.println("⚠ WARNING: Failed to join LoRaWAN network!");
    Serial.println("⚠ Data transmission will be disabled until network join succeeds");
  }

  // Initialize LittleFS (format on first mount if needed)
  Serial.println("Mounting LittleFS...");
  if (!LittleFS.begin(true)) {
    Serial.println("Error mounting LittleFS!");
    while (true); // halt
  }
  Serial.println("LittleFS mounted successfully");

  // Open database
  Serial.println("Opening database...");
  try {
    database.open("/littlefs/database.db");
    Serial.println("Database opened successfully");
  } catch (const std::exception &e) {
    Serial.print("Error opening database: ");
    Serial.println(e.what());
    while (true); // halt
  }

  // Initialize SPI and RFID reader
  Serial.println("Initializing RFID reader...");
  SPI.begin(36, 37, 35); // SCK, MISO, MOSI
  rfid.PCD_Init();       // Initialize RFID reader
  Serial.println("RFID reader initialized successfully");

  // Initialize PIR motion sensor
  Serial.println("Initializing PIR motion sensor...");
  pinMode(PIR_PIN, INPUT);
  Serial.println("PIR sensor initialized (GPIO 4)");

  // Initialize Ultrasound distance sensor
  Serial.println("Initializing ultrasound sensor...");
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  digitalWrite(TRIG_PIN, LOW); // Ensure trigger starts LOW
  Serial.println("Ultrasound sensor initialized (TRIG: GPIO 6, ECHO: GPIO 7)");

  // Wait for PIR to stabilize (HC-SR501 needs ~60 seconds to calibrate)
  Serial.println("Waiting for PIR sensor to stabilize (5 seconds)...");
  delay(5000);
  Serial.println("PIR sensor ready!");

  Serial.println("\n=== System Ready ===");
  Serial.println("- RFID Access Control Active");
  Serial.println("- LoRaWAN Communication Active");
  Serial.println("- PIR Motion Sensor Active");
  Serial.println("- Ultrasound Distance Sensor Active");
  Serial.println("- Deep Sleep Mode Active");
  Serial.print("- Trashcan depth configured: ");
  Serial.print(TRASHCAN_DEPTH_CM);
  Serial.println(" cm");
  
  // Configure deep sleep wake-up sources
  configure_deep_sleep();
  
  // If this was a timer wake-up, send periodic LoRaWAN data and go back to sleep
  if (wakeup_reason == ESP_SLEEP_WAKEUP_TIMER) {
    send_periodic_lorawan_data();
    Serial.println("Timer wake-up complete. Going back to sleep...");
    enter_deep_sleep();
    // Note: This function never returns - CPU resets on wake-up
  }
  
  // If this was a PIR wake-up, also send periodic data (but stay awake for RFID)
  if (wakeup_reason == ESP_SLEEP_WAKEUP_EXT0) {
    Serial.println("\n🚶 PIR wake-up: Sending status update before entering active window...");
    send_periodic_lorawan_data();
    Serial.println("Status update sent. Now entering active window for RFID scan...");
  }
  
  // Reset wake_up_time NOW (after all initialization is complete)
  // This ensures the active window starts after setup, not during it
  wake_up_time = millis();
  
  // Print active window info
  Serial.print("\n⏱️  Active window: ");
  Serial.print(ACTIVE_WINDOW_MS / 1000);
  Serial.println(" seconds");
  Serial.println("Waiting for RFID scan...\n");
}

void loop() {
  static unsigned long last_sensor_read = 0;
  
  // Check for incoming LoRaWAN messages (non-blocking)
  check_incoming_lorawan();
  
  // Calculate time remaining in active window
  unsigned long elapsed = millis() - wake_up_time;
  unsigned long remaining = (elapsed < ACTIVE_WINDOW_MS) ? (ACTIVE_WINDOW_MS - elapsed) : 0;
  
  // Print countdown every 2 seconds (along with sensor readings)
  if (millis() - last_sensor_read > 2000) {
    print_sensor_readings();
    
    // Show time remaining before deep sleep and current counter
    Serial.print("📊 Usage counter: ");
    Serial.println(usage_counter);
    Serial.print("⏱️  Time to deep sleep: ");
    Serial.print(remaining / 1000);
    Serial.println(" seconds\n");
    
    last_sensor_read = millis();
  }
  
  // Check if a new RFID card is present
  if (rfid.PICC_IsNewCardPresent() && rfid.PICC_ReadCardSerial()) {
    // Format the RFID UID as a string
    String rfidTag = format_rfid(rfid.uid.uidByte, rfid.uid.size);
    
    Serial.println("\n--- Card Detected ---");
    Serial.print("RFID Tag: ");
    Serial.println(rfidTag);
    
    // Check access in database
    bool access_granted = check_access(rfidTag);
    
    if (access_granted) {
      // Worker authenticated - send notification and go to sleep immediately
      worker_authenticated = true;
      
      // Small delay to avoid LoRaWAN busy error (in case status update was just sent)
      Serial.println("⏳ Waiting 2 seconds before sending notification (avoid busy error)...");
      delay(2000);
      
      // Send emptied notification with raw RFID bytes
      send_emptied_notification(rfid.uid.uidByte, rfid.uid.size);
      
      Serial.println("✓ Worker authenticated. Going to sleep (no counter increment)...");
      
      // Halt the card
      rfid.PICC_HaltA();
      
      // Go to sleep immediately - worker emptied the trash
      enter_deep_sleep();
      // Note: This function never returns - CPU resets on wake-up
    } else {
      // Unknown RFID - just print message and continue waiting
      Serial.println("Unknown RFID detected. Continuing to wait for valid worker...");
      Serial.println("---------------------\n");
      
      // Halt the card
      rfid.PICC_HaltA();
      
      // Small delay to avoid multiple reads
      delay(1000);
    }
  }
  
  // Check if active window has expired - enter deep sleep
  if (elapsed >= ACTIVE_WINDOW_MS) {
    // No worker was authenticated during this wake cycle
    if (!worker_authenticated) {
      Serial.println("\n⏰ Active window expired - no worker authenticated");
      increment_counter();
    }
    
    enter_deep_sleep();
    // Note: This function never returns - CPU resets on wake-up
  }
}
