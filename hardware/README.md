# Checkmate row PCB — Rev A prototype

[Saved EasyEDA PCB](https://easyeda.com/editor#id=9d5da3f9bfcd4c178cbfc71bebbd2e59)

## Fabrication

Upload `checkmate-row-rev-a-gerbers.zip` to JLCPCB for bare PCBs. Select 406.4 x 50.8 mm, two layers, 1.6 mm FR4, 1 oz copper, green mask, white silkscreen and lead-free HASL (ENIG optional). Single rectangular board; no panelization or V-cuts. Eight identical boards cover the chessboard. No order has been placed.

`row-pcb-easyeda.json` is editable PCB source. `row-gerber-preview.png` is rendered from the exported Gerber/drill files. `row-pcb-preview.svg` provides placement/routing coordinates. `row-bom.csv` lists individual components. `ordering-bom.csv` gives consolidated quantities.

## Mechanical assembly

All dimensions below are millimeters, viewed from the component side, origin at top left. Square centers are (25.4 + 50.8*i, 25.4), i=0..7. Each square is 50.8 x 50.8 mm. Red/green LED centers are 7 mm left/right of each square centerline, at y=10.

Eight 3.2 mm nonplated mounting holes are at all combinations of x=4,101.6,304.8,402.4 and y=4,46.8. Use M3 nylon spacers/screws. Set spacer height to clear the DIP socket and other parts, and extend Hall/LED leads to the required height. The 1.6 mm recommendation is PCB thickness, not wood thickness. Verify actual-size print scale with a ruler before drilling the playing surface.

Lay each A3144 body flat, branded sensitive face toward the playing surface, centered on its crosshair. Gently form leads to the V/G/O holes 6 mm below the crosshair, with 2.54 mm spacing. Pin 1=VCC, 2=GND, 3=OUT. Verify purchased parts match this pinout. Test the actual magnet and wooden surface before fixing sensor height: magnetic distance depends on magnet strength, polarity and the wood/air gap.

## Parts and soldering

All components go on the component side. U9 uses a DIP-16 socket with 7.62 mm row spacing. U10/U11 require TLC6C598 in TI's PW TSSOP-16 package, 0.65 mm pitch, 4.4 x 5 mm body; SOIC parts will not fit. U9 notch points left; pin 1 is lower left. U10/U11 pin 1 is also lower left and marked on silk.

Solder TSSOP chips first using flux and inspect for bridges. Follow with resistors, ceramic caps, socket, headers, then taller parts. Insert U9 after inspecting joints.

- R1-R8/R25/R26: 10 kohm; R9-R24: 1 kohm; R27: 100 kohm. Axial 1/4 W, leads bent to 10.16 mm pitch.
- C1-C11: 100 nF ceramic, preferably X7R, >=10 V, 5.08 mm lead spacing, body <=6 x 3 mm. Nonpolarized. C10/C11 rotated 90 degrees.
- C12: 10 uF electrolytic, >=10 V, 2.5 mm lead spacing, body diameter <=6.3 mm. Square pad is positive; negative stripe goes to the other pad.
- D1-D8 red; D9-D16 green: 5 mm through-hole LEDs, 2.54 mm pitch. Square pad 1=cathode K; round pad 2=anode A. Set LED height using actual chessboard holes before soldering.
- J1/J2: unshrouded 2x5 headers, 2.54 mm pitch. Square pad is pin 1. Verify cable pin numbering.

## Connections

This row uses regulated 5 V. The separate ESP32 interface board still needs to be designed, including level translation, clock buffering and power distribution. Do not directly connect the row's 5 V outputs or pull-ups to ESP32 GPIOs.

| Pin | J1 input | J2 output |
| --- | --- | --- |
| 1 | +5V | +5V |
| 2 | GND | GND |
| 3 | HALL_LOAD_N | HALL_LOAD_N |
| 4 | HALL_CLK | HALL_CLK |
| 5 | HALL_SER_IN | HALL_SER_OUT |
| 6 | LED_CLK | LED_CLK |
| 7 | LED_LATCH | LED_LATCH |
| 8 | LED_CLEAR_N | LED_CLEAR_N |
| 9 | LED_OE_N | LED_OE_N |
| 10 | LED_SER_IN | LED_SER_OUT |

Connect J2 to the next row's J1 by matching pin numbers. Viewed from above, odd pins are left, even pins right, 1/2 at the top. Controller sends LED data to first J1 pin 10 and reads Hall data from last J2 pin 5. Tie first-row J1 pin 5 to ground. Last-row J2 pin 10 can remain open. Controls are shared. Plan separate power feeds to rows from the central board rather than carrying all current through one thin ribbon. Budget about 150 mA per row plus controller overhead.

Startup: OE high, CLEAR low, clocks/latch low. Release CLEAR high, shift complete LED chain, pulse latch high then low, then enable OE low. A 1 lights its LED. For one row send green bits 7..0 then red bits 7..0. For multiple rows send furthest row first; 16 bits per row, 128 total.

Hall reading: clock low, pulse LOAD low then high, read initial serial output, then successive bits after rising clock edges. One row returns square 7 first through square 0; last row appears first in a chain. LOW means magnet detected. Read 64 bits for eight rows. Start slowly, e.g. 10 kHz; clock integrity/termination across the assembled system needs measurement.

## First-board test and verification limits

1. Inspect orientation and solder bridges. Check for a persistent low-resistance short between 5 V and GND while unpowered.
2. Power one row from a current-limited regulated 5 V supply, controls defined as above. Start with a 150 mA limit; investigate if the supply remains in current limit. Verify voltage at U9 pin 16 and far-end connector.
3. Check each Hall output is high without a magnet and low with the correct pole. Verify serial bit-to-square mapping.
4. Shift a walking single 1 through the LED chain, then test all on/all off.
5. Test detection through the final surface and check adjacent magnets do not cause false detection. Validate one populated row before soldering the other seven.

The 68-component, 202-pad, 53-net layout passes local continuous geometry connectivity/clearance checks and is checked in EasyEDA. Minimum copper clearance is 0.2 mm. Gerber readback verifies board dimensions and drill alignment. Reports are saved alongside the files. This first revision has not been bench-tested; layout checks do not guarantee magnetic range, soldering quality or full-system clock performance.

Regenerate sequentially: `node hardware/route-pcb.mjs`, `node hardware/check-pcb.mjs`, `node hardware/export-pcb.mjs`, then `python hardware/inspect-gerbers.py` (Pillow required). Reimport into EasyEDA, rerun DRC and recreate ZIP after changes. Older `row-placement-2inch.svg` is only a placement guide.

References: [TLC6C598](https://www.ti.com/lit/ds/symlink/tlc6c598.pdf), [SN74HC165](https://www.ti.com/lit/ds/symlink/sn74hc165.pdf), [A3144](https://www.allegromicro.com/~/media/Files/Datasheets/A3141-2-3-4-Datasheet.ashx?la=en).
