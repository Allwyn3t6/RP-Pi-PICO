import machine
import utime
input_pin=machine.pin(0,machine.PIN.IN)
output_pin=machine.pin(2,machine.PIN.OUT)
while true:
    input_value=input_pin.value()
    result=not input_value
    output_pin.value(result)
    utime.sleep(0.1)
