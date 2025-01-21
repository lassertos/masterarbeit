export const arduinoSketchTemplateVPSPU = `\
// these are the usable sensors
const int LimitXLeft = 22;
const int LimitXRight = 23;
const int LimitYTop = 24;
const int LimitYBottom = 25;

// these are the usable actuators
const int MotorXLeft = 26;
const int MotorXRight = 27;
const int MotorYTop = 28;
const int MotorYBottom = 29;

// perform setup actions in this function
void setup() {
    // setup sensors
    pinMode(LimitXLeft, INPUT);
    pinMode(LimitXRight, INPUT);
    pinMode(LimitYTop, INPUT);
    pinMode(LimitYBottom, INPUT);

    // setup actuators
    pinMode(MotorXLeft, OUTPUT);
    pinMode(MotorXRight, OUTPUT);
    pinMode(MotorYTop, OUTPUT);
    pinMode(MotorYBottom, OUTPUT);
}

// write the main loop in this function
void loop() {
    // TODO
}`;
