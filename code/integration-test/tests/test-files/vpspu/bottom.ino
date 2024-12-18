void driveBottom(int LimitYBottom, int MotorYBottom)
{
    if (digitalRead(LimitYBottom) != HIGH)
    {
        digitalWrite(MotorYBottom, HIGH);
        while (digitalRead(LimitYBottom) != HIGH)
            ;
        digitalWrite(MotorYBottom, LOW);
    }
}