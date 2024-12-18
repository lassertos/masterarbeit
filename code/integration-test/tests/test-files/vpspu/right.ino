void driveRight(int LimitXRight, int MotorXRight)
{
    if (digitalRead(LimitXRight) != HIGH)
    {
        digitalWrite(MotorXRight, HIGH);
        while (digitalRead(LimitXRight) != HIGH)
            ;
        digitalWrite(MotorXRight, LOW);
    }
}