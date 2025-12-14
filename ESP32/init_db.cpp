#include <Arduino.h>
#include <SQLiteManager.h>
#include <LittleFS.h>
#include <ArduinoJson.h>

SQLiteManager database;

void setup() {
	Serial.begin(115200); delay(500);

	if (!LittleFS.begin(false)) {
		Serial.println("Error mounting LittleFS!");
		while (true);
	}

	try {
		database.open("/littlefs/database.db");
	} catch (const std::exception &e) {
		Serial.println(e.what());
		while (true);
	}

	// Create role table (reference table for integrity)
	try {
		database.execute(
			"CREATE TABLE IF NOT EXISTS role ("
			"role_code TEXT PRIMARY KEY"
			")"
		);
		Serial.println("Table 'role' created.");
	} catch (const std::exception &e) {
		Serial.println(e.what());
	}

	// Insert default roles
	try {
		database.execute("INSERT OR IGNORE INTO role (role_code) VALUES (?)", "WORKER");
		database.execute("INSERT OR IGNORE INTO role (role_code) VALUES (?)", "ADMIN");
		Serial.println("Default roles inserted.");
	} catch (const std::exception &e) {
		Serial.println(e.what());
	}

	// Create user table with FK to role
	try {
		database.execute(
			"CREATE TABLE IF NOT EXISTS user ("
			"id INTEGER PRIMARY KEY AUTOINCREMENT, "
			"name TEXT NOT NULL, "
			"rfid_tag_id TEXT NOT NULL UNIQUE, "
			"role TEXT NOT NULL, "
			"FOREIGN KEY (role) REFERENCES role(role_code)"
			")"
		);
		Serial.println("Table 'user' created.");
	} catch (const std::exception &e) {
		Serial.println(e.what());
	}

	// Create index on rfid_tag_id for faster lookups
	try {
		database.execute("CREATE INDEX IF NOT EXISTS idx_user_rfid ON user(rfid_tag_id)");
		Serial.println("Indexes created.");
	} catch (const std::exception &e) {
		Serial.println(e.what());
	}

	Serial.println("Database initialization complete!");
}

void loop() {
	// Nothing to do in loop
}
