from machine import Pin,SPI
import st7789
spi=SPI(0,62500000,sck=Pin(18),mosi=Pin(19),polarity=1,phase=0)
display=st7789.ST7789(spi,240,240,reset=Pin(20),dc=Pin(17),xstart=0,ystart=0,rotation=0)
display.fill(0)
import vga2_16x32
import chango_16
import time
time.sleep(1)
Pin(15,Pin.OUT).value(0)
time.sleep(2)
Pin(15,Pin.OUT).value(1)

'''for i in range(255):
    display.fill(st7789.color565(i,0,0))
display.fill(0)
for i in range(255):
    display.fill(st7789.color565(0,i,0))
display.fill(0)
for i in range(255):
    display.fill(st7789.color565(0,0,i))
display.fill(0)'''
while True:
    try:
        display.write(chango_16,"HELLO WORLD",50,50,0xffff,0)
        #time.sleep(0.001)
        display.fill(0)
    except KeyboardInterrupt:
        break