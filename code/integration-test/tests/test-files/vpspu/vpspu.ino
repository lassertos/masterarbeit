const int LimitXLeft = 22;
const int LimitXRight = 23;
const int LimitYTop = 24;
const int LimitYBottom = 25;
const int MotorXLeft = 26;
const int MotorXRight = 27;
const int MotorYTop = 28;
const int MotorYBottom = 29;

void setup()
{
    pinMode(LimitXLeft, INPUT);
    pinMode(LimitXRight, INPUT);
    pinMode(LimitYTop, INPUT);
    pinMode(LimitYBottom, INPUT);
    pinMode(MotorXLeft, OUTPUT);
    pinMode(MotorXRight, OUTPUT);
    pinMode(MotorYTop, OUTPUT);
    pinMode(MotorYBottom, OUTPUT);
}

void loop()
{
    if (digitalRead(LimitXLeft) != HIGH)
    {
        digitalWrite(MotorXLeft, HIGH);
        while (digitalRead(LimitXLeft) != HIGH)
            ;
        digitalWrite(MotorXLeft, LOW);
    }

    if (digitalRead(LimitYTop) != HIGH)
    {
        digitalWrite(MotorYTop, HIGH);
        while (digitalRead(LimitYTop) != HIGH)
            ;
        digitalWrite(MotorYTop, LOW);
    }

    if (digitalRead(LimitXRight) != HIGH)
    {
        digitalWrite(MotorXRight, HIGH);
        while (digitalRead(LimitXRight) != HIGH)
            ;
        digitalWrite(MotorXRight, LOW);
    }

    if (digitalRead(LimitYBottom) != HIGH)
    {
        digitalWrite(MotorYBottom, HIGH);
        while (digitalRead(LimitYBottom) != HIGH)
            ;
        digitalWrite(MotorYBottom, LOW);
    }
}