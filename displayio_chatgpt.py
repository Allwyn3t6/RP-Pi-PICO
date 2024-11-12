import touch_display
import displayio
from adafruit_display_text import label
from adafruit_touchscreen import Touchscreen

# Initialize the display
spi = board.SPI()
tft_cs = board.D9
tft_dc = board.D8
display_bus = displayio.FourWire(spi, command=tft_dc, chip_select=tft_cs, reset=None)
display = displayio.display(display_bus)

# Initialize the touch screen
touch = Touchscreen(board.D0, board.D1, calibration=((5200, 59000), (5800, 57000)))
# Create a bitmap for graphics
bitmap = displayio.Bitmap(display.width, display.height, 1)

# Create a group to hold display elements
group = displayio.Group()
display.show(group)
# Create a TileGrid with the bitmap
tile_grid = displayio.TileGrid(bitmap, pixel_shader=displayio.ColorConverter())
group.append(tile_grid)
while True:
    # Check if the screen is touched
    if touch.touch_point:
        x, y = touch.touch_point
        # Check if the touch point is within a specific area
        if 50 < x < 200 and 50 < y < 100:
            # Perform an action when the touch area is pressed
            text_label.text = "Touched!"
        else:
            text_label.text = "Hello Touch Display"
    else:
        text_label.text = "Hello Touch Display"
