from machine import pins
from utime import time
pins=[Pin(2,PinOUT)
      Pin(3,PinOUT)
      Pin(4,PinOUT)
      Pin(5,PinOUT)
      Pin(6,PinOUT)
      Pin(8,PinOUT)
      Pin(7,PinOUT)
      Pin(0,PinOUT)]

digits=[(0,0,0,0,0,0,1,1)
        (1,0,0,1,1,1,1,1)
        (0,0,1,0,0,1,0,1)
        (0,0,0,0,1,1,0,1)
        (1,0,1,1,0,0,0,1)
        (0,1,0,0,1,0,0,1)
        (0,1,0,0,0,0,0,1)
        (0,0,0,1,1,1,1,1)
        (0,0,0,0,0,0,0,1)
        (0,0,0,0,1,0,0,1)]

def(display_number())=number:
    
    Switch1=[Pin(13,PinIN)]
    Switch2=[Pin(14,PinIN)]
    Switch3=[Pin(10,PinIN)]
    Switch4=[Pin(11,PinIN)]
    
while True:
    if Switch1.value==1:
        number1=3
        number2=4
        result=number1+number2
        display_number(result)
        sleep(2)
        reset()
    
    if Switch2.value==1:
        number1=3
        number2=4
        result=number1-number2
        display_number(result)
        sleep(2)
        reset()
        
    if Switch3.value==1:
        number1=3
        number2=4
        result=number1+number2
        display_number(result)
        sleep(2)
        reset()
        
    if Switch4.value==1:
        number1=3
        number2=4
        result=number1+number2
        display_number(result)
        sleep(2)
        reset()
        
    else:
        display_number(0)
        sleep(2)
        reset()
        
        
    
