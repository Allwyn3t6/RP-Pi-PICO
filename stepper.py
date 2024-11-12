from machine import Pin
from time import sleep_us

# Define the GPIO pins for the stepper motor
coil_A_1_pin = Pin(10, Pin.OUT)
coil_A_2_pin = Pin(11, Pin.OUT)
coil_B_1_pin = Pin(12, Pin.OUT)
coil_B_2_pin = Pin(13, Pin.OUT)

# Define the stepping sequence for the stepper motor (4-step sequence)
# You may need to adjust the sequence depending on your motor type
# For example, for a different motor, you might use [1,0,1,0] or [0,1,0,1] instead.
sequence = [[1, 0, 0, 1],
            [1, 0, 0, 0],
            [1, 1, 0, 0],
            [0, 1, 0, 0],
            [0, 1, 1, 0],
            [0, 0, 1, 0]]

# Function to turn the stepper motor
def step_motor(steps, delay_us=1000):
    for _ in range(steps):
        for step in sequence:
            coil_A_1_pin.value(step[0])
            coil_A_2_pin.value(step[1])
            coil_B_1_pin.value(step[2])
            coil_B_2_pin.value(step[3])
            sleep_us(delay_us)

# Example usage: Rotate the motor 200 steps clockwise with a 500 microseconds delay
try:
    while True:
        step_motor(200, delay_us=500)
        sleep_us(1000000)  # Pause for 1 second between rotations

except KeyboardInterrupt:
    # Turn off all coils before exiting
    coil_A_1_pin.value(0)
    coil_A_2_pin.value(0)
    coil_B_1_pin.value(0)
    coil_B_2_pin.value(0)
                                                                                                                                                                                                                                                            