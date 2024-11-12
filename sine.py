import machine
import utime
import math

# Define the I2C pins and PCF8591T address
i2c = machine.I2C(0, sda=machine.Pin(0), scl=machine.Pin(1))
pcf8591t_address = 0x48  # Default I2C address for PCF8591T

# Create an ADC object for reading analog values from GP26 (AIN0)
analog_input_pin = machine.ADC(26)  # GP26 corresponds to AIN0 on the RP2040

# Define the read_analog_value function
def read_analog_value():
    analog_value = analog_input_pin.read_u16()  # Read the analog value (0-65535)
    print("Analog Value:", analog_value)

# Main loop to generate a sine wave
try:
    while True:
        for i in range(256):
            # Calculate the sine value for a full cycle (0 to 2*pi)
            angle = (i / 255) * 2 * math.pi
            # Scale the sine value to the DAC range (0-255)
            dac_value = int((math.sin(angle) + 1) * 127.5)
            # Write the scaled value to the DAC
            i2c.writeto(pcf8591t_address, bytes([0x40, dac_value]))
            # Read and print the analog value during the sine wave generation
            read_analog_value()
            utime.sleep_us(500)  # Adjust the delay for the desired frequency
except KeyboardInterrupt:
    print("Program terminated.")
