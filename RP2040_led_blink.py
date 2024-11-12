from machine import Pin
from time import sleep

# Create a Pin object for GPIO1
# The second parameter is the mode, where Pin.OUT signifies a digital output
led = Pin(0, Pin.OUT)

while True:
    # The .value method can be used to set the digital logic level. 
    # Setting it to 1 turns the LED on
    led.value(1)
    sleep(0.5)  # pause for half a second
    # Setting the value to 0 turns the LED off
    led.value(0)
    sleep(0.5)  # pause for half a second
