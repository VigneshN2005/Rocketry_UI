# Mission Control Hub

Design a professional aerospace Ground Control Station UI (PySide6/PyQt5) for a CanSat competition. Use a hybrid Mission Control + Engineering Dashboard style (NASA/ISRO inspired), dark grey theme, responsive for 1920×1080+.

Layout

 Single application window

 One permanent CanSat dashboard (Cyan accents)

 Clean aerospace styling, high readability, competition-ready

Global Header

 Mission Clock

 CanSat RF Status

 Launch Site / Mission ID

 Alert Banner (Simulation Mode, Link Lost, Low Battery, Mission Complete)

CanSat Dashboard

Include:

 Independent Flight State Timeline

 Live Telemetry Cards:

 Altitude, Velocity, Pressure

 Humidity

 IAQ Index

 Gas Resistance

 Radiation CPM & Dose Rate

 IR Temperature

 GPS Position

 Battery Voltage & Current

 RSSI & Link Quality

 Sensor Health Indicators

 Live Charts:

 Altitude

 Humidity

 IAQ

 Radiation

 Battery Current

 Motor RPM

 Motor Current

 IR Temperature

 Live GPS Map:

 Descent Path

 Predicted Landing Zone

 Landing Marker

 Motor Control Panel:

 Arm/Disarm

 Start/Stop Motors

 Auto Landing

 Throttle Slider

 Large Emergency Stop Button

 Commands:

 TELEMETRY_ENABLE

 IMU_CALIBRATE

 DEPLOY_CHUTE

 SERVO_TRIGGER

 ARM_PROPELLERS

 START_MOTORS

 STOP_MOTORS

 DISABLE_ACTIVE_SYSTEMS

 COMM_TEST

 SIMULATION_ENABLE

 SIMULATION_ACTIVATE

Shared Bottom Section

 Dual 3D Attitude Indicators

 Packet Monitor (TX/RX/Loss)

 RF Configuration Panel

 Simulation Playback Controls (1x/2x/5x)

 Full Command Console with ACK status and timestamps

Technical Requirements

 PySide6 / PyQt5

 PyQtGraph for real-time plots

 QThread-based telemetry workers

 Dedicated thread for the CanSat link

 Non-blocking UI

 Real-time updates

 Modular widgets

 Competition-grade mission-control appearance

 Design should look impressive to judges while remaining practical for operators.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/7ff24fc1-be21-420b-8365-d21388e9b163).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
