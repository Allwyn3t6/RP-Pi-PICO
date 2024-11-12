from machine import Pin
from time import sleep

# Define the GPIO pins for each segment of the display
# Connect the pins to the corresponding segments of the 7-segment display
segments = [Pin(0, Pin.OUT),   # a
            Pin(1, Pin.OUT),   # b
            Pin(2, Pin.OUT),   # c
            Pin(3, Pin.OUT),   # d
            Pin(4, Pin.OUT),   # e
            Pin(5, Pin.OUT),   # f
            Pin(6, Pin.OUT)]   # g

# Define the common cathode pin for the 7-segment display
common_cathode = Pin(7, Pin.OUT)

# Define the patterns for each digit (0 to 9) on the display
digit_patterns = [
    [0, 0, 0, 0, 0, 0, 1], # 0
    [1, 0, 0, 1, 1, 1, 1], # 1
    [0, 0, 1, 0, 0, 1, 0], # 2 
    [0, 0, 0, 0, 1, 1, 0], # 3
    [1, 0, 0, 1, 1, 0, 0], # 4
    [0, 1, 0, 0, 1, 0, 0], # 5
    [0, 1, 0, 0, 0, 0, 0], # 6
    [0, 0, 0, 1, 1, 1, 1], # 7
    [0, 0, 0, 0, 0, 0, 0], # 8
    [0, 0, 0, 1, 1, 0, 0], # 9
  ]

def display_digit(digit):
    # Activate the corresponding segments based on the digit pattern
    for i, state in enumerate(digit_patterns[digit]):
        segments[i].value(state)

try:
    while True:
        for num in range(10):
            # Display each digit for a short period (e.g., 1 second)
            display_digit(num)
            common_cathode.value(0)  # Turn on the display
            sleep(1)
            common_cathode.value(1)  # Turn off the display
            sleep(0.2)  # Pause between digits

except KeyboardInterrupt:
    # Turn off all segments and the display before exiting
    for segment in segments:
        segment.value(0)
    common_cathode.value(1)
