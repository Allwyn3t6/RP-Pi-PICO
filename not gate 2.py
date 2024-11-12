from machine import Pin
from time import sleep
IN1=Pin(2,Pin.OUT)
IN2=Pin(3,Pin.OUT)
IN3=Pin(4,Pin.OUT)
IN4=Pin(5,Pin.OUT)
pins=[IN1,IN2,IN3,IN4]
sequence1=[[1,0,0,0],[0,1,0,0],[0,0,1,0],[0,0,0,1]]
sequence2=[[0,0,0,1],[0,0,1,0],[0,1,0,0],[1,0,0,0]]
Ranges=[0,1]
switch1=Pin(0,Pin.IN)
switch2=Pin(1,Pin.IN)
while True:
    if switch1.value()==1:
        for i in Ranges:
            for step in sequence1:
                for j in range(len(pins)):
                    pins[j].value(step[j])
                    #sleep(0.01)
                #sleep(1)
    #sleep(2)
    if switch2.value()==1:
        for i in Ranges:
            for step in sequence2:
                for j in range(len(pins)):
                    pins[j].value(step[j])
                    #sleep(0.01)
                #sleep(1)