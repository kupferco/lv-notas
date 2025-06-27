#!/bin/bash
psql -h localhost -U dnkupfer clinic_db < $1
