-- Un sensor con lecturas no se borra: se retira para conservar su historial.
ALTER TYPE "EstadoSensor" ADD VALUE 'retirado';
