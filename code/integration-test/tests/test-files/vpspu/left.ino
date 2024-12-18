void driveLeft(int LimitXLeft, int MotorXLeft)
{
    if (digitalRead(LimitXLeft) != HIGH)
    {
        digitalWrite(MotorXLeft, HIGH);
        while (digitalRead(LimitXLeft) != HIGH)
            ;
        digitalWrite(MotorXLeft, LOW);
    }
}