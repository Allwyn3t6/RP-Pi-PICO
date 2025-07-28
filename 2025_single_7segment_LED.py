from machine import Pin
from time import sleep

# Define segment pins (A to G)
segments = [
    Pin(0, Pin.OUT),  # A
    Pin(1, Pin.OUT),  # B
    Pin(2, Pin.OUT),  # C
    Pin(3, Pin.OUT),  # D
    Pin(4, Pin.OUT),  # E
    Pin(5, Pin.OUT),  # F
    Pin(6, Pin.OUT),  # G
]

# Segment states for digits 0–9: [A, B, C, D, E, F, G]
digits = [
    [1,1,1,1,1,1,0],  # 0
    [0,1,1,0,0,0,0],  # 1
    [1,1,0,1,1,0,1],  # 2
    [1,1,1,1,0,0,1],  # 3
    [0,1,1,0,0,1,1],  # 4
    [1,0,1,1,0,1,1],  # 5
    [1,0,1,1,1,1,1],  # 6
    [1,1,1,0,0,0,0],  # 7
    [1,1,1,1,1,1,1],  # 8
    [1,1,1,1,0,1,1],  # 9
]

while True:
    for digit in digits:
        for seg, val in zip(segments, digit):
            seg.value(val)
        sleep(1)
