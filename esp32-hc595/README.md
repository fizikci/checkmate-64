# ESP32 + 74HC595: eight LEDs

Standalone Arduino learning project for a **classic ESP32 DevKit / ESP32-WROOM** and one **74HC595 DIP-16**. Other ESP32 variants may need different GPIO assignments. This breadboard exercise is separate from the chessboard row PCB.

## How it works

One DATA wire carries the eight bits sequentially. Two more GPIO wires provide CLOCK (when to read each bit) and LATCH (when to display the completed byte). So this circuit uses **three ESP32 GPIOs**, not one GPIO total.

The sketch sends bit 7 first. After eight clock pulses, a latch pulse copies the byte to QA through QH. Outputs hold their state until the next latch; no continuous refresh is needed.

```text
ESP32 GPIO23 -- DATA  --> shift register -- latch --> QA QB QC QD QE QF QG QH
ESP32 GPIO18 -- CLOCK -->   eight bits                 |  |  |  |  |  |  |  |
ESP32 GPIO19 -- LATCH -------------------->           eight resistor + LED pairs
```

## Parts and wiring

Disconnect USB/power while wiring. Use one breadboard, jumper wires, eight red LEDs, **eight 1 kohm resistors** (one per LED), and one **100 nF ceramic capacitor**. Power the HC595 from **3.3 V**, matching ESP32 logic. A 5 V HC595 does not guarantee recognition of ESP32 HIGH levels; do not substitute 5 V in this circuit.

For a DIP-16 chip viewed from above with its notch at the top, pin 1 is top left; numbers run down the left side to 8, then up the right side from 9 to 16.

| 74HC595 pin | Signal | Connect to |
| --- | --- | --- |
| 16 | VCC | ESP32 3V3 |
| 8 | GND | ESP32 GND |
| 14 | SER / DS | GPIO23, data |
| 11 | SRCLK / SH_CP | GPIO18, clock |
| 12 | RCLK / ST_CP | GPIO19, latch |
| 10 | /SRCLR / /MR | 3V3 (clear inactive) |
| 13 | /OE | GND (outputs enabled) |
| 9 | QH' serial output | Leave unconnected |

Place the 100 nF capacitor between pins 16 and 8, close to the chip. All grounds must be connected. With /OE tied low, LEDs may briefly show random states at power-up before setup clears them.

For **each** output below, connect `output -> 1 kohm resistor -> LED anode (+)`, then `LED cathode (-) -> GND`. The cathode is usually the shorter leg/flat side; verify your LED. Red LEDs provide useful headroom at 3.3 V; current is roughly 1 mA per LED, depending on forward voltage and output drop.

| LED | Output | Chip pin | Byte bit |
| --- | --- | --- | --- |
| 1 | QA / Q0 | 15 | 0 (rightmost digit) |
| 2 | QB / Q1 | 1 | 1 |
| 3 | QC / Q2 | 2 | 2 |
| 4 | QD / Q3 | 3 | 3 |
| 5 | QE / Q4 | 4 | 4 |
| 6 | QF / Q5 | 5 | 5 |
| 7 | QG / Q6 | 6 | 6 |
| 8 | QH / Q7 | 7 | 7 (leftmost digit) |

## Run

1. Install Arduino IDE and the **esp32 by Espressif Systems** board package using Boards Manager.
2. Open `esp32-hc595.ino` in this folder. The sketch and folder names intentionally match.
3. Select your board (typically **ESP32 Dev Module** for a classic WROOM DevKit) and its USB port, then upload. No extra sketch libraries are required.
4. Open Serial Monitor at **115200 baud**, with **Newline** or **Both NL & CR** enabled. Press reset if you missed the startup message.
5. Send one of the following commands. Binary commands stop the demo and hold the selected pattern.

| Command | Result |
| --- | --- |
| `00000001` | LED 1 only |
| `10000000` | LED 8 only |
| `10101010` | LEDs 2, 4, 6, 8 |
| `11111111` | All LEDs on |
| `00000000` or `off` | All LEDs off |
| `demo` | One LED at a time, every 500 ms, repeating |

Only eight binary digits are accepted as a number: `170` is not accepted; send `10101010`. Invalid input leaves the current mode unchanged. The Serial Monitor prints bits in **QH..QA** order, so the rightmost digit controls LED 1.

To set a byte directly in code, call `writeLeds(0b10101010);` after GPIO initialization. `writeLeds(170);` and `writeLeds(0xAA);` mean the same thing. The explicit loop in `writeLeds()` shows each data bit and clock pulse; Arduino's `shiftOut(DATA_PIN, CLOCK_PIN, MSBFIRST, value)` can replace that loop.

## First checks

Start with `00000001`, then `demo`, then `11111111`. If nothing lights, check chip orientation, common ground, /OE low, /MR high, and LED polarity. If LED order is reversed, compare your physical layout with the bit table. GPIO numbers are not header position numbers.

Firmware has not been uploaded or tested on physical hardware here. Arduino compilation also requires an installed ESP32 toolchain.

## References

- [TI SN74HC595 datasheet: pinout, power and timing](https://www.ti.com/lit/ds/symlink/sn74hc595.pdf)
- [Espressif Arduino GPIO reference](https://docs.espressif.com/projects/arduino-esp32/en/latest/api/gpio.html)
- [Espressif Arduino basic tutorial](https://docs.espressif.com/projects/arduino-esp32/en/latest/tutorials/basic.html)
