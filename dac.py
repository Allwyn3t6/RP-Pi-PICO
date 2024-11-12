import machine
import utime

# Define the I2C pins and PCF8591T address
i2c = machine.I2C(0, sda=machine.Pin(0), scl=machine.Pin(1))
pcf8591t_address = 0x48  # Default I2C address for PCF8591T

# Create an ADC object for reading analog values from GP26 (AIN0)
analog_input_pin = machine.ADC(26)  # GP26 corresponds to AIN0 on the RP2040

# Set the initial DAC value to the midpoint (128 out of 255)
dac_value = 128

def read_analog_value():
    analog_value = analog_input_pin.read_u16()  # Read the analog value (0-65535)
    print("Analog Value:", analog_value)

# Main loop to generate a triangle wave
try:
    while True:
        # Increase or decrease the DAC value to create a triangle wave
        for i in range(256):
            i2c.writeto(pcf8591t_address, bytes([0x40, dac_value]))
            dac_value = (dac_value + 1) % 256
            utime.sleep_us(10)  # Adjust the delay for the desired frequency
            read_analog_value()  # Read and print the analog value during the triangle wave generation
        for i in range(255, -1, -1):
            i2c.writeto(pcf8591t_address, bytes([0x40, dac_value]))
            dac_value = (dac_value - 1) % 256
            utime.sleep_us(10)  # Adjust the delay for the desired frequency
            read_analog_value()  # Read and print the analog value during the triangle wave generation

except KeyboardInterrupt:
    print("Program terminated.")
