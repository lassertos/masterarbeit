#include <avr/io.h>

int main() {
  DDRA = 0xff;
  PORTA = 0x03;
  DDRB = 0x1f;
  DDRB = (1 << DDB0) | (1 << DDB1) | (1 << DDB2) | (1 << DDB3) | (1 << DDB4);

  while (1)
    ;
}