from machine import ADC
import time
adc =ADC(Pin(26))
led1 = Pin(1,Pin.OUT)
led2 =Pin(2,Pin.OUT)
adc_value=adc.read_u16()
display(adc_value)
while true:
    if adc_value>700:
        led1.value(1)
        sleep(0.5)
    if adc_value<700:
        led2.value(1)
        sleep(0.5)