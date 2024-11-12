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
# Main loop to generate a square wave
try:
    while True:
        # Set the DAC value to 0 (minimum)
        i2c.writeto(pcf8591t_address, bytes([0x40, 0]))
        utime.sleep_us(10000)  # Adjust the delay for the desired frequency
        read_analog_value()  # Read and print the analog value

        # Set the DAC value to 255 (maximum)
        i2c.writeto(pcf8591t_address, bytes([0x40, 255]))
        utime.sleep_us(10000)  # Adjust the delay for the desired frequency
        read_analog_value()  # Read and print the analog value

except KeyboardInterrupt:
    print("Program terminated.")


