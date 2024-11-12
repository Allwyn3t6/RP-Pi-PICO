from machine import Pin, SPI, PWM
import framebuf
import os
import utime

BL = 13
DC = 8
RST = 12
MOSI = 11
SCK = 10
CS = 9

class LCD_2inch8(framebuf.FrameBuffer): # For 320x240 display
    def __init__(self):
        self.width = 240  # Adjusted width for the ST7789 display
        self.height = 320  # Adjusted height for the ST7789 display
        
        self.cs = Pin(CS, Pin.OUT)
        self.rst = Pin(RST, Pin.OUT)
        
        self.cs(1)
        self.spi = SPI(1, baudrate=10000000, polarity=1, phase=0, sck=Pin(SCK), mosi=Pin(MOSI), miso=None)
        self.dc = Pin(DC, Pin.OUT)
        self.dc(1)
        self.buffer = bytearray(self.height * self.width * 2)
        super().__init__(self.buffer, self.width, self.height, framebuf.RGB565)
        self.init_display()

        self.RED   =   0xF800
        self.GREEN =   0x07E0
        self.BLUE  =   0x001F
        self.WHITE =   0xFFFF
        self.BLACK =   0x0000

    def write_cmd(self, cmd):
        self.cs(1)
        self.dc(0)
        self.cs(0)
        self.spi.write(bytearray([cmd]))
        self.cs(1)

    def write_data(self, buf):
        self.cs(1)
        self.dc(1)
        self.cs(0)
        self.spi.write(buf)
        self.cs(1)

    def init_display(self):
        """Initialize display"""
        self.rst(1)
        self.rst(0)
        self.rst(1)
        
        self.write_cmd(0x36)
        self.write_data(bytearray([0x70]))  # Adjusted for ST7789
        
        # Other initialization commands...

    def show(self):
        self.write_cmd(0x2A)
        self.write_data(bytearray([0x00, 0x00, 0x01, 0x3F]))  # Adjusted for ST7789
        
        self.write_cmd(0x2B)
        self.write_data(bytearray([0x00, 0x00, 0x00, 0xEF]))  # Adjusted for ST7789
        
        self.write_cmd(0x2C)
        
        self.cs(1)
        self.dc(1)
        self.cs(0)
        self.spi.write(self.buffer)
        self.cs(1)

def play_mp3_file(file_path):
    audio = pyb.Audio(44100, bits=16)
    audio.set_buffer_size(512)
    audio.play(file_path)
    while audio.playing():
        utime.sleep_ms(100)

def main():
    pwm = PWM(Pin(BL))
    pwm.freq(1000)
    pwm.duty_u16(32768)

    LCD = LCD_2inch8()

    mp3_files = [file for file in os.listdir('/') if file.endswith('.mp3')]

    if mp3_files:
        print("Found MP3 files. Playing the first one:")
        file_path = '/' + mp3_files[0]
        print(f"Playing: {file_path}")
        play_mp3_file(file_path)
    else:
        print("No MP3 files found in the root directory.")

if __name__ == '__main__':
    main()
