# Pimoroni Pico Display Workout
# Tony Goodhew 15th Feb 2021
# Tested with Pimoroni UF2 Ver: 0.0.7

import picodisplay as display 
import utime, random, math
from machine import Pin
width = display.get_width()
height = display.get_height()
display_buffer = bytearray(width * height * 2)
display.init(display_buffer)
# Set the backlight to 90% - Needed on Display
display.set_backlight(0.9)

def blk():
    display.set_pen(0,0,0)
    display.clear()
    display.update()
    
def title(msg,r,g,b):
    blk()
    display.set_pen(r,g,b)
    display.text(msg, 20, 10, 200, 4)
    display.update()
    utime.sleep(2)
    blk()
    
def horiz(l,t,r):    # left, right, top
    n = r-l+1        # Horizontal line
    for i in range(n):
        display.pixel(l + i, t)

def vert(l,t,b):   # left, top, bottom
    n = b-t+1      # Vertical line
    for i in range(n):
        display.pixel(l, t+i)

def box(l,t,r,b):  # left, top, right, bottom
    horiz(l,t,r)   # Hollow rectangle
    horiz(l,b,r)
    vert(l,t,b)
    vert(r,t,b)

def line(x,y,xx,yy): # (x,y) to (xx,yy)
    if x > xx:
        t = x  # Swap co-ordinates if necessary
        x = xx
        xx = t
        t = y
        y = yy
        yy = t
    if xx-x == 0:  # Avoid div by zero if vertical
        vert(x,min(y,yy),max(y,yy))
    else:          # Draw line one dot at a time L to R
        n=xx-x+1
        grad = float((yy-y)/(xx-x))  # Calculate gradient
        for i in range(n):
            y3 = y + int(grad * i)
            display.pixel(x+i,y3)  # One dot at a time

def show(tt):
    display.update()
    utime.sleep(tt)

def align(n, max_chars):
    # Aligns string of n in max_chars
    msg1 = str(n)
    space = max_chars - len(msg1)
    msg2 = ""
    for m in range(space):
        msg2 = msg2 +" "
    msg2 = msg2 + msg1
    return msg2  # String - ready for display

def ring(cx,cy,rr): # Centre and radius
    display.circle(cx,cy,rr)
    display.set_pen(0,0,0) # background colour
    display.circle(cx,cy,rr-1)
    
def ring2(cx,cy,r):   # Centre (x,y), radius
    for angle in range(0, 90, 2):  # 0 to 90 degrees in 2s
        y3=int(r*math.sin(math.radians(angle)))
        x3=int(r*math.cos(math.radians(angle)))
        display.pixel(cx-x3,cy+y3)  # 4 quadrants
        display.pixel(cx-x3,cy-y3)
        display.pixel(cx+x3,cy+y3)
        display.pixel(cx+x3,cy-y3)

def showgraph(v,rr,gg,bb):   # Bar graph
    display.set_pen(255,0,0)
    display.text("P", 8, 50, 240, 3)
    display.set_pen(0,0,0)        # Blank old bar graph
    display.rectangle(29, 50, 220, 16)
    display.set_pen(int(r*2.55),int(g*2.55),int(b*2.55))    # New  bar graph
    if v == 1:vert(29, 50, 65) # Ensure these show up
    if v == 2:vert(30, 50, 65)
    display.rectangle(29, 50, v, 15)
    display.set_pen(100,100,100)  # Base line zero
    vert(28, 46, 68)             
    display.set_pen(0,0,255)      # percentage
    display.text(str(align(v,4)) + " %", 140, 48, 240, 3)

# Define special 5x8 characters - 8 bytes each - 0...7
# Bytes top to bottom, 5 least significant bits only
smiley = [0x00,0x0A,0x00,0x04,0x11,0x0E,0x00,0x00]
sad = [0x00,0x0A,0x00,0x04,0x00,0x0E,0x11,0x00]
heart = [0,0,0,10,31,14,4,0]
b_heart = [0,10,31,0,0,14,4,0]
up_arrow =[0,4,14,21,4,4,0,0]
down_arrow = [0,4,4,21,14,4,0,0]
bits = [128,64,32,16,8,4,2,1]  # Powers of 2

def mychar2(xpos, ypos, pattern):  # Print defined character
    for line in range(8):       # 5x8 characters
        for ii in range(5):     # Low value bits only
            i = ii + 3
            dot = pattern[line] & bits[i]  # Extract bit
            if dot:  # Only print WHITE dots
                display.pixel(xpos+i*2, ypos+line*2)
                display.pixel(xpos+i*2, ypos+line*2+1)
                display.pixel(xpos+i*2+1, ypos+line*2)
                display.pixel(xpos+i*2+1, ypos+line*2+1)
                
def mychar3(xpos, ypos, pattern):  # Print defined character
    for line in range(8):       # 5x8 characters
        for ii in range(5):     # Low value bits only
            i = ii + 3
            dot = pattern[line] & bits[i]  # Extract bit
            if dot:  # Only print WHITE dots
                display.pixel(xpos+i*3, ypos+line*3)
                display.pixel(xpos+i*3, ypos+line*3+1)
                display.pixel(xpos+i*3, ypos+line*3+2)
                display.pixel(xpos+i*3+1, ypos+line*3)
                display.pixel(xpos+i*3+1, ypos+line*3+1)
                display.pixel(xpos+i*3+1, ypos+line*3+2)
                display.pixel(xpos+i*3+2, ypos+line*3)
                display.pixel(xpos+i*3+2, ypos+line*3+1)
                display.pixel(xpos+i*3+2, ypos+line*3+2)

# ==== Main ====
print("Start")
title("Pimoroni Pico Display Workout",200,200,0)
# === Basics ===
title("Basics",200,0,0)
display.set_pen(255,255,0)
line(10,10,100,100)
show(0.25)
display.set_pen(255,0,255)
line(10,100,100,10)
show(0.25)
display.set_pen(0,255,255)
box(10,10,100,100)
show(0.25)
display.set_pen(255,0,0)
ring(160,50,50)
show(0.25)
display.set_pen(255,255,0)
ring2(160,50,40)
show(0.25)
display.set_pen(0,0,255)
display.circle(160,50,30)
show(0.25)
display.set_pen(0,255,255)
display.rectangle(150,40,20,20)
show(0.25)
display.set_pen(255,255,0)
display.text(" Tony Goodhew", 15, 115, 240, 3)  
display.update()
utime.sleep(3)
blk()
display.set_pen(255,0,255)
display.text("Predefined characters", 10, 0, 240, 3)
display.set_pen(0,0,255)
mychar2(20, 60, up_arrow)    # Defined characters
mychar2(40, 60, smiley)      
mychar2(60, 60, heart)
mychar2(20, 90, down_arrow)  
mychar2(40, 90, sad) 
mychar2(60, 90, b_heart)
mychar3(120, 50, up_arrow)   # Bigger
mychar3(140, 50, smiley)      
mychar3(160, 50, heart)
mychar3(120, 80, down_arrow)  
mychar3(140, 80, sad) 
mychar3(160, 80, b_heart)
show(3)

# Character Set - No lower case!
title("Character set",200,200,0)
display.set_pen(0,200,0)
display.text("Character Set", 15, 15, 200, 2)
s = ""
count = 0
for i in range(32,128,8):
    for j in range(0,8,1):
        p = i + j
        if ((p < 97) or (p>122)):
            s = s + chr(p)
            count = count + 1
            if (count)/16 == int((count)/16):
                s = s +" "  # 'space' for text wrap
print(s)
display.set_pen(200,200,0)
display.text(s, 15, 40, 200, 2)
display.set_pen(0,0,200)
display.text("No lower case", 140, 110, 200, 1)
display.update()
utime.sleep(3)
blk()
display.set_pen(200,200,200)
display.text("Size 1", 15, 5, 200, 1)
display.set_pen(200,0,200)
display.text("Size 2", 15, 20, 200, 2)
display.set_pen(200,0,0)
display.text("Size 3", 15, 44, 200, 3)
display.set_pen(0,0,200)
display.text("Size 4", 15, 70, 200, 4)
display.set_pen(0,200,0)
display.text("Size 6", 15, 100, 200, 6)
display.update()
utime.sleep(2)

# Lines demo
title("lines",200,0,0)                  
for step in range(18, 2, -5):
    blk()
    display.set_pen(0,0,0)    
    display.clear()
    red = random.randint(0, 255)
    green = random.randint(0, 255)
    blue =random.randint(0, 255)
    display.set_pen(red, green, blue)
    x = 0  # Block 1
    y = 0
    x2 = 239
    for y2 in range(0,135, step):
        line(x, y, x2, y2)
        display.update()
    x = 0  # Block 2
    y = 134
    x2 = 239
    for y2 in range(239,-1,-step):
        line(x, y, x2, y2)
        display.update()
    x = 239  # Block 3
    y = 0
    x2 = 0
    for y2 in range(0,135, step):
        line(x, y, x2, y2)
        display.update()
    x = 239  # Block 4
    y = 134
    x2 = 0
    for y2 in range(239,-1,-step):
        line(x, y, x2, y2)
        display.update()
    utime.sleep(0.5)

# === Sin & Cos graphs ====
title("Drawing graphs",0,200,0)
factor = 361 /240
display.set_pen(80,80,80)
horiz(0,60,239)    
display.update()
display.set_pen(200,0,0)
for x in range(0,240):
    y = int ((math.sin(math.radians(x * factor)))* -50) + 60
    display.pixel(x,y)
    display.update()
display.text("Sine", 40, 70, 200, 2)
display.update()
utime.sleep(3)
blk()
display.set_pen(80,80,80)
horiz(0,60,239)    
display.update()
display.set_pen(0,200,0)
for x in range(0,240):
    y = int((math.cos(math.radians(x * factor)))* -50) + 60
    display.pixel(x,y)
display.text("Cosine", 90, 30, 200, 2)
display.update()
utime.sleep(3)

title("Text on a path",0,0,200)
# Text on a downward slant
display.set_pen(255,0,0)
msg =" Pimoroni pico display!"
b = bytes(msg, 'utf-8')
for i in range(len(b)):
    c = b[i]
    display.character(c, i*10,i*5 + 4, 2)
    display.update()
utime.sleep(3)
blk()
# Text on a Sine wave
factor = 361 /240
display.set_pen(0,255,0)
for i in range(len(b)):
    y = int ((math.sin(math.radians(i*10 * factor)))* -50) + 50
    c = b[i]
    display.character(c, i*10,y +10,2)
    display.update()
utime.sleep(3)

title("Scrolling on a Sine Curve",0,0,200)
# Scrolling on a Sine curve
# Modified from a method by Tony DiCola for a SSD1306
msg = 'Scrolling on a sine curve using a pico display! press y button  '
f_width  = 13   # Font width in pixels
f_height = 10   # Font Height in pixels
amp = 100   # Amplitude of sin wave
freq = 1    # Screen cycles (360 degrees)
   
pos = width  # X position of the first character in the msg.
msg_len_px = len(msg) * f_width  # Pixel width of the msg.
# Extra wide lookup table - calculate once to speed things up
y_table = [0] * (width+f_width) # 1 character extra
for i in range(len(y_table)):
    p = i / (width-1)  # Compute current  position along
    # lookup table in 0 to 1 range.
    # Get y co-ordinate from table
    y_table[i] = int(((amp/2.0) * math.sin(2.0*math.pi*freq*p)) + (amp/2.0))
    
# Scrolling loop:
blk()
running = True
while running:
    # Clear scroll area
    display.set_pen(0,0,0) 
    display.rectangle(0, 10, 240, 135)
    display.set_pen(200,200,0)
    # Start again if msg finished
    pos -= 1
    if pos <= -msg_len_px:
        pos = width
    # Go through each character in the msg.

    for i in range(len(msg)):
        char = msg[i]
        char_x = pos + (i * f_width)  # Character's X position on the screen.
        if -f_width <= char_x < width:
            # If haracter is visible, draw it.
            display.text(char, char_x + 5, y_table[char_x+f_width]+10,2)
    display.set_pen(100,100,100)
    display.text("Press button Y to halt", 5, 215, 230, 2)
    display.update()
    if display.is_pressed(3): # Y button is pressed ?
        running = False
    utime.sleep(0.01)

# Physical Computing: Buttons, LED PWM and Bar Graph
blk()
title("Blink Pico's LED",0,0,200)
led = machine.Pin(25, machine.Pin.OUT)
display.set_pen(0,0,255)
display.text("BLINKING", 20, 10, 200, 4)
display.update()
for i in range(5):
    led.value(1)
    utime.sleep(0.33)
    led.value(0)
    utime.sleep(0.33)
blk()

display.set_pen(0,0,255)
title("Fade Pico's LED using PWM",0,0,200)
led = machine.PWM(machine.Pin(25))
led.freq(1000)
display.set_pen(0,0,255)
display.text("FADING", 20, 10, 200, 4)
display.update()
for cycle in range(5):
    for duty in range(0, 65535, 4096): # Fade UP
        led.duty_u16(65535 - duty)
        utime.sleep(0.08)
    for duty in range(0, 65535, 4096): # Fade DOWN
        led.duty_u16(duty)
        utime.sleep(0.08)   
led.duty_u16(65535) # LED OFF
led = Pin(25, Pin.IN, Pin.PULL_DOWN) # Normal state
blk()

title("Dynamic graphics",0,0,200)
display.set_pen(255,255,255)
display.text("Press A and B buttons", 10, 0, 230, 2)
display.set_pen(200,200,200)
display.text("Press Y button to halt", 5, 15, 230, 2)
display.set_pen(0,100,0)
box(60,80,180,200)
pot = 50
running = True
while running:    
    if display.is_pressed(0): # A pressed
        pot = pot + 1
        if pot > 100: pot = 100
    if display.is_pressed(1): # B pressed
        pot = pot - 1
        if pot < 0 : pot = 0    
    utime.sleep(0.02)
    
    display.update()
    display.set_pen(pot,pot,pot) # grey to white
    display.circle(120,140,50)
    # Calculate rainbow colour
    if pot < 50: # Blue -> Cyan -> Green
        r = 0
        g = int(pot * 2)
        b = int(100 - pot * 2)   
    else:       # Green -. Yellow -> Red
        r = int((pot-50)*2)
        g = int(100 - ((pot-50)*2))
        b = 0
    display.set_led(r,g,b)
    percent = pot
    showgraph(percent,r,g,b)
    if display.is_pressed(3): # Y button is pressed ?
        running = False
      
# Tidy up
blk()
display.set_led(0,0,0) # Set the LED to black
display.set_pen(200,0,0)
led = Pin(25, Pin.IN, Pin.PULL_DOWN) # Normal state
display.text("All Done!", 55, 40, 200, 3)
display.update()
utime.sleep(2)
blk()

