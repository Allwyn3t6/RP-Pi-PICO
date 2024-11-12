from machine import Pin
from time import sleep

# Create Pin objects for GPIO 0 (LED) and GPIO 2 (push switch)
led = Pin(0, Pin.OUT)
push_switch = Pin(2, Pin.IN, Pin.PULL_DOWN)

while True:
    # Check if the push switch is pressed (input is HIGH)
    if push_switch.value() == 1:
        # Turn on the LED
        led.value(1)
    else:
        # Turn off the LED
        led.value(0)
    
    # Add a small delay to avoid rapid polling and reduce CPU usage
    sleep(0.1)
