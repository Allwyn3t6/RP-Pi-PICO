from machine import pin,I2C
from RP2040_I2C_LCD import I2C_LCD
import utime
I2C=machine.I2C(0,scl=pin(9),sda=pin(8),freq=100000)
LCD=I2C_LCD(I2C,2,16)
print.lcd("raspberry")
print.lcd("pi RP2040")
if _"name"_ = _"main"_
main()