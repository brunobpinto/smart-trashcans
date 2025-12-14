![Smart-Trashcans-Banner](https://github.com/user-attachments/assets/1b873901-4a76-4f26-98c0-676b1c51de97)

# Smart Trashcans
This project was developed as the final activity for the Internet of Things (IoT) Project class at PUC-Rio, Brazil. It presents a smart waste monitoring system for PUC-Rio’s campus bins. Each device tracks fill levels, cleaning history, and usage peaks, displaying the data on an interactive dashboard with a campus map. The system classifies bins by cleaning urgency using color indicators: green, yellow, and red.
<br><br>

## Video
Watch how we made this project in the video below:

https://github.com/user-attachments/assets/5f297aff-46dd-469c-831e-9b2488daee38

## Important Links
- Entrepreneurship Presentation: [Google Slides](https://docs.google.com/presentation/d/1eFLQctskUMzdFxHRRN8Uq6AJgMyZpdaHZNqkaKqREag/edit?usp=sharing)
- Final Project Video: [Youtube](https://youtu.be/zSX_mzMJ4nE)
- 3D Modelling and Assembly: [OnShape](https://cad.onshape.com/documents/b87a7e99e19c62217d651890/w/9fb80a89a01454b3f9800e65/e/fb9532ab13b9a6d6421fd709?renderMode=0&uiState=69321752dd5747af1b660e4b)
- PCB Schematic: [EasyEDA Project.](https://bit.ly/smart-trashcans)

## How It Works
The Smart Trashcans system combines IoT hardware, wireless communication, and a cloud-connected dashboard to monitor waste levels and cleaning activity across the PUC-Rio campus.
Below is an overview of how each component interacts to provide real-time insights.

**1- Data Collection (ESP32-S3 Device)** <br>

Each trashcan is equipped with an ESP32-S3 microcontroller connected to multiple sensors: <br>

- **Fill Level Measurement**: <br>
The HC-SR04 ultrasonic sensor measures the distance from the top of the bin to the waste.
The device calculates the fill percentage using: `Fill % = ((TrashcanDepth - MeasuredDistance) / TrashcanDepth) × 100`

- **Motion Detection**: <br>
A PIR sensor detects when a worker approaches the bin.
The ESP32 wakes from deep sleep when motion is detected (GPIO 4 RTC interrupt), reducing energy consumption. <br>

- **Cleaning Validation (RFID)**: <br>
Workers authenticate using an RFID tag (RC522 module).
Successful scans log the cleaning event and identify the worker.

- **Wireless Communication (LoRaWAN)**: <br>
The device sends: <br>
-- fill level <br>
-- motion-triggered events <br>
-- cleaning confirmations <br>
-- Data is transmitted via the Radioenge LoRaMesh module to the gateway.

**2- Local Access Control (On-Device SQLite)** <br>

The ESP32 maintains a lightweight database using SQLite + LittleFS containing:
- Authorized users
- Roles (WORKER, ADMIN)
- Cleaning and access logs
- This allows the trashcan to operate even without Wi-Fi or cloud connectivity.

**3- Data Transmission to Server** <br>

The LoRaWAN gateway forwards packets to the backend, which decodes them and stores data in a centralized PostgreSQL database using Prisma ORM. The received payload typically includes:
- trashcanId
- fillLevel
- timestamp
- rfidTagId (optional)
- motionDetected

**4- Backend Processing** <br>

The backend (Next.js API routes) performs tasks such as:
- Storing fill levels
- Updating cleaning history
- Validating RFID access
- Generating usage analytics
- Serving data to the dashboard
  
All routes are secured using NextAuth to ensure only authorized personnel can access the system.

**5- Interactive Dashboard (Next.js + Tailwind)** <br>

The web dashboard provides:

- **Campus Map Visualization** <br>
Each trashcan appears as a marker with a color-coded status: <br>
-- 🟢 Green: Low fill level <br>
-- 🟡 Yellow: Approaching limit <br>
-- 🔴 Red: Needs immediate cleaning

- **Real-Time Charts** <br>
Fill level over time
Cleaning frequency
Worker activity logs
Peak usage periods

- **Role-Based Interface** <br>
`Admins`: Can view analytics, manage users, and track logs
`Workers`: See bins needing cleaning and validate actions via RFID

**6- Energy Optimization** <br>

To extend battery life, the ESP32 uses:
- Deep sleep between measurement intervals
- Wake-up on PIR motion or timed interval
- Periodic LoRa transmissions instead of constant communication
- This allows the device to operate for months on a single 18650 battery.

**7- Full System Workflow Summary** <br>

- Sensors collect measurements
- ESP32 stores data locally and sends key values via LoRa
- Backend receives and stores information in PostgreSQL
- Dashboard displays real-time bin status and alerts
- Workers authenticate via RFID and perform cleaning
- System updates history and analytics automatically

## Getting Started

### Hardware Requirements
- ESP32-S3 N8R2 microcontroller
- Ultrasound Distance Sensor
- RFID Reader
- LoRaWAN Modem
- Motion Sensor
- 18650 Battery

### Software Requirements
- Next.js with Typescript
- Prisma
- Tailwind CSS
- NextAuth
- Postgres Database

> [!IMPORTANT]
> It’s important to note that this application is designed to work with a PostgreSQL database. If you’re using a different database, a few minor adjustments will be required for proper functionality.

### GPIO Pin Mapping
**RFID Reader (RC522)**

| Pin  | GPIO | Function             |
| ---- | ---- | -------------------- |
| SDA  | 46   | SPI Chip Select (SS) |
| RST  | 17   | Reset                |
| SCK  | 12   | SPI Clock            |
| MISO | 13   | SPI Data Out         |
| MOSI | 11   | SPI Data In          |
| VCC  | 3.3V | Power                |
| GND  | GND  | Ground               |

**LoRaWAN Module (Radioenge LoRaMesh v4)**

| Pin | GPIO | Function              |
| --- | ---- | --------------------- |
| TX  | 47   | Serial1 TX (ESP→LoRa) |
| RX  | 48   | Serial1 RX (LoRa→ESP) |
| VCC | 3.3V | Power                 |
| GND | GND  | Ground                |

- Baud Rate: 9600
- Serial Mode: 8N1

**PIR Motion Sensor (HC-SR501)**

| Pin  | GPIO | Function                                 |
| ---- | ---- | ---------------------------------------- |
| DATA | 4    | Digital output (RTC-capable for wake-up) |
| VCC  | 5V   | Power                                    |
| GND  | GND  | Ground                                   |

- GPIO 4 is RTC-capable, suitable for deep sleep wake-up interrupts
- HC-SR501 requires ~60 seconds to calibrate on power-up
- Output is HIGH when motion detected

**Ultrasound Distance Sensor (HC-SR04)**

| Pin  | GPIO | Function             |
| ---- | ---- | -------------------- |
| TRIG | 10   | Trigger (send pulse) |
| ECHO | 9    | Echo (receive pulse) |
| VCC  | 5V   | Power                |
| GND  | GND  | Ground               |

- `TRASHCAN_DEPTH_CM`: Distance from sensor to bottom when empty (default: 30 cm)
- Measurement timeout: 30ms (max range ~5m)
- Distance (cm) = (pulse duration × 0.0343) / 2
- Fill % = ((TRASHCAN_DEPTH - measured distance) / TRASHCAN_DEPTH) × 100

## Installation
This section explains how to set up the complete **Smart Trashcans** system, including the web application, database, and ESP32-S3 firmware.
1. **Clone the Repository** <br>
`git clone https://github.com/brunobpinto/smart-trashcans.git` <br>
`cd smart-trashcans`

2. **Web Application Setup (Next.js + TypeScript)**
- Install dependencies using `npm install`
- Configure environment variables
- Create a file named: `.env.local`
- Add the following: <br>
`DATABASE_URL="postgresql://user:password@localhost:5432/smarttrashcans"` <br>
`NEXTAUTH_SECRET="your_secure_random_key"` <br>
`NEXTAUTH_URL="http://localhost:3000"`

3. **Database Setup (PostgreSQL)**
- Create the database: `createdb smarttrashcans`
- Apply Prisma schema migrations: `npx prisma migrate dev`

4. **Run the Web Application**
- Run in terminal: `npm run dev`
- Access the dashboard at your localhost

5. **ESP32-S3 Firmware Setup**
- Make sure you meet all the Hardware Requirements

6. **ESP32 File System & Database Initialization**
- On first boot, the firmware will automatically: <br>
Mount LittleFS <br>
Create `/littlefs/database.db` <br>
Create the tables: `role`, `user`, `logs` <br>
Insert default roles: `WORKER`, `ADMIN`

7. **Running the Entire System**
- Start PostgreSQL
- Start the web application: `npm run dev`
- Power the ESP32-S3 and sensors

The dashboard will begin displaying data in real time

## 3D Printed Files
All 3D-printed files can be found in the `/3D-FILES` directory.

> [!WARNING]
> While the 3D parts can be printed using various materials, it is recommended to use weather-resistant materials if the device will be installed outdoors. Materials such as PETG, ASA, or ABS are suitable for outdoor exposure, as they can withstand sunlight and moisture. PLA is not recommended, as it degrades quickly under heat and UV light.
<div>‎</div>

## PCB Schematic
![Smart-Trashcans-Schematic](https://github.com/user-attachments/assets/5d186018-6281-4e48-bf26-967ee84a0399)

> [!NOTE]
> The full circuit, including the schematic, PCB design, and 3D model, is available on the [EasyEDA Project.](https://bit.ly/smart-trashcans)
<div>‎</div>

### Preview
![Smart-Trashcans-3D-front](https://github.com/user-attachments/assets/ca759f75-0c94-48ff-9f42-e6d0d800fd6f)
![Smart-Trashcans-3D-back](https://github.com/user-attachments/assets/d343ee3b-4378-44d8-96dd-5baa7ea02c32)

## ESP32 Internal Database Schema 
- **Table: `role`** - Reference table for role integrity control.

| Column      | Type | Constraints | Description     |
| ----------- | ---- | ----------- | --------------- |
| `role_code` | TEXT | PRIMARY KEY | Role identifier |

Pre-populated Data:
`'WORKER'`
`'ADMIN'`

- **Table: `user`** - Stores registered users with their RFID tags and assigned roles.

| Column        | Type    | Constraints                   | Description            |
| ------------- | ------- | ----------------------------- | ---------------------- |
| `id`          | INTEGER | PRIMARY KEY AUTOINCREMENT     | Unique user identifier |
| `name`        | TEXT    | NOT NULL                      | User's full name       |
| `rfid_tag_id` | TEXT    | NOT NULL, UNIQUE              | RFID tag identifier    |
| `role`        | TEXT    | NOT NULL, FK → role.role_code | User's role            |

- **Table: `logs`** - Logs all access attempts with timestamps.

| Column        | Type    | Constraints               | Description                 |
| ------------- | ------- | ------------------------- | --------------------------- |
| `id`          | INTEGER | PRIMARY KEY AUTOINCREMENT | Unique log entry identifier |
| `rfid_tag_id` | TEXT    | NOT NULL                  | RFID tag that was scanned   |
| `datetime`    | TEXT    | NOT NULL                  | Timestamp (ISO8601 format)  |

### Relationships
- **Foreign Key Constraint:** `user.role` references `role.role_code`
- **Enforcement:** Foreign key constraints are enabled via `PRAGMA foreign_keys = ON`

### Database Configuration
- **Location:** `/littlefs/database.db`
- **Filesystem:** LittleFS (auto-formatted on first mount)
- **Platform:** ESP32 S3 (N8R2)

> [!IMPORTANT]
> This project uses SQLite stored on the ESP32 S3's LittleFS filesystem for access control management.

## Achievements
Entrepreneurship Fair Winner – The Smart Trashcans project won an entrepreneurship fair held at PUC-Rio on December 5th, recognizing the project for its innovation, technical execution, and real-world impact.

![Smart-Trashcans-trophy](https://github.com/user-attachments/assets/c0f2f933-056f-48d2-8aff-5d611bce9632)


## Contributors
We would like to extend our heartfelt thanks to everyone who contributed to the development of this project. Your support, ideas, and dedication were essential in bringing this project to life.

- [@aurorarichaud](https://github.com/aurorarichaud)
- [@brunobpinto](https://github.com/brunobpinto)
- [@bathwaterpizza](https://github.com/bathwaterpizza)

Thank you all for your hard work and collaboration!
