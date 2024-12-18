void driveTop(int LimitYTop, int MotorYTop)
{
    if (digitalRead(LimitYTop) != HIGH)
    {
        digitalWrite(MotorYTop, HIGH);
        while (digitalRead(LimitYTop) != HIGH)
            ;
        digitalWrite(MotorYTop, LOW);
    }
}