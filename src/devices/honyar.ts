import {Zcl} from "zigbee-herdsman";
import * as fz from "../converters/fromZigbee";
import * as tz from "../converters/toZigbee";
import * as exposes from "../lib/exposes";
import * as m from "../lib/modernExtend";
import * as reporting from "../lib/reporting";
import * as tuya from "../lib/tuya";
import type {DefinitionWithExtend, KeyValueAny} from "../lib/types";

const e = exposes.presets;
const ea = exposes.access;

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ['HY0124'],
        model: 'IHG4201',
        vendor: 'Honyar',
        description: 'Water leak sensor',
        extend: [
            m.battery(),
            m.iasZoneAlarm({
                "zoneType":"water_leak",
                "zoneAttributes":["alarm_1","battery_low"],
                "zoneStatusReporting":false
            })
        ],
    },
    {
        zigbeeModel: ['HY0024'],
        model: 'HS1SA',
        vendor: 'Honyar',
        description: 'Smoke detector',
        extend: [
            m.battery(),
            m.iasZoneAlarm({
                "zoneType":"smoke",
                "zoneAttributes":["alarm_1","battery_low"]
            })
        ],
    },
    {
        zigbeeModel: ['005b0e12'],
        model: 'HC-109ZB(AL)',
        vendor: 'Honyar',
        description: 'Siren alarm',
        extend: [
            m.battery(),
            m.iasZoneAlarm({
                "zoneType": "generic",
                "zoneAttributes": ["tamper"]
            }),
        ],
        toZigbee: [{
                key: ['warning'],
                convertSet: async(entity, key, value: KeyValueAny, meta) => {
                    const mode: Record<string, number> = {
                        stop: 0,
                        arming: 0,
                        disarming: 1,
                        burglar: 1,
                        fire: 2,
                        emergency: 3
                    };
                    const level: Record<string, number> = {
                        low: 0,
                        medium: 1,
                        high: 2,
                        very_high: 3
                    };

                    const warningMode = value.mode ? mode[value.mode] : mode.emergency;
                    const soundLevel = value.level ? level[value.level] : level.medium;
                    const strobe = value.strobe !== undefined ? value.strobe : 1;
                    const duration = value.duration || 10;
                    // const warningcycle = value.warningcycle || 3;

                    if (value.mode !== "arming" && value.mode !== "disarming") {
                        const payload = {
                            startwarninginfo: (warningMode << 4) + (strobe << 2) + soundLevel,
                            warningduration: duration,
                            strobedutycycle: 0,
                            strobelevel: 1,
                        }
                        await entity.command('ssIasWd', 'startWarning', payload, {});
                    } else {
                        const payload = {
                            squawkinfo: (warningMode << 4) + (strobe << 3) + soundLevel,
                        }
                        await entity.command('ssIasWd', 'squawk', payload, {disableDefaultResponse: true, disableResponse: true, timeout: 0});
                    };
                },
            }
        ],
        exposes: [
            e.composite('warning', 'warning', ea.SET)
                .withFeature(e.enum('mode', ea.SET, ['stop', 'arming', 'disarming', 'burglar', 'fire', 'emergency']).withDescription('Mode of the warning (sound effect)'))
                .withFeature(e.enum('level', ea.SET, ['low', 'medium', 'high', 'very_high']).withDescription('Sound level'))
                .withFeature(e.binary('strobe', ea.SET, true, false).withDescription('Turn on/off the strobe (light) during warning'))
                .withFeature(e.numeric('duration', ea.SET).withUnit('s').withDescription('Duration in seconds of the alarm'))
        ],
        meta: {
            disableDefaultResponse: true,
            // timeout: false
        },
    },
    {
        zigbeeModel: ['HY0104'],
        model: 'U2-86Z223A10-ZJ-GY',
        vendor: 'Honyar',
        description: 'Smart power socket 10A (with power monitoring)',
        extend: [
            m.onOff({
                "powerOnBehavior":false
            }),
            m.electricityMeter()
        ],
        meta: {},
    },
    {
        zigbeeModel: ['HY0106'],
        model: 'U2-86Z13A16ZJ-GY',
        vendor: 'Honyar',
        description: 'Smart power socket 16A (with power monitoring)',
        extend: [
            m.onOff({"powerOnBehavior":false}),
            m.electricityMeter(),
            m.binary({
                name: "child_lock",
                valueOn: ["ON", 1],
                valueOff: ["OFF", 0],
                cluster: "genOnOff",
                attribute: {ID: 0x8000, type: Zcl.DataType.BOOLEAN},
                description: "Enable/Disable child lock",
                reporting: {min: 0, max: 3600, change: 1},
                entityCategory: "config",
            }),
            m.binary({
                name: "light_indicator",
                valueOn: ["ON", 1],
                valueOff: ["OFF", 0],
                cluster: "genOnOff",
                attribute: {ID: 0x8005, type: Zcl.DataType.BOOLEAN},
                description: "Enable/Disable light_indicator",
                reporting: {min: 0, max: 3600, change: 1},
                entityCategory: "config",
            }),
            m.enumLookup({
                name: "power_on_behavior",
                lookup: {off: 1, previous: 0},
                cluster: "genOnOff",
                attribute: {ID: 0x8006, type: Zcl.DataType.BOOLEAN},
                description: "Controls the behavior when the device is powered on after power loss.",
                reporting: {min: 0, max: 3600, change: 1},
                entityCategory: "config",
            }),
            m.enumLookup({
                name: "clear_metering",
                lookup: {clear: 1,},
                cluster: "seMetering",
                attribute: {ID: 0x8000, type: Zcl.DataType.BOOLEAN},
                access: "STATE_SET",
                zigbeeCommandOptions: {disableDefaultResponse: true},
                description: "Clear measurement data.",
                entityCategory: "config",
            }),
        ],
        meta: {},
    },
    {
        zigbeeModel: ['001a14f4'],
        model: 'U2-86CGQ-ZHY-GY',
        vendor: 'Honyar',
        description: 'Human body movement sensor',
        extend: [
            m.iasZoneAlarm({
                "zoneType":"occupancy",
                "zoneAttributes":["alarm_1","tamper"]
            })
        ],
        meta: {},
    },
    {
        zigbeeModel: ['0009223f'],
        model: 'U2-86KTGS150-ZXP-GY',
        vendor: 'Honyar',
        description: 'Smart knob dimmer',
        extend: [
            m.light({
                "colorTemp":{"startup": false,"range":[153,370]}, 
                "effect":false, 
                "powerOnBehavior": false,
            })
        ],
        meta: {},
    },
    {
        zigbeeModel: ['HY0023'],
        model: 'IHG5520',
        vendor: 'Honyar',
        description: 'Infrared bidirectional curtain human sensor',
        extend: [
            m.battery(),
            m.iasZoneAlarm({
                "zoneType": "generic",
                "zoneAttributes": ["alarm_1", "alarm_2", "tamper", "battery_low"]
            })
        ],
        meta: {},
    },
    {
        zigbeeModel: ['0079159d'],
        model: 'U86KJB-ZD(AL)',
        vendor: 'Honyar',
        description: 'Emergency button(86 type)',
        extend: [
            m.iasZoneAlarm({
                "zoneType":"generic",
                "zoneAttributes":["alarm_1"]
            })
        ],
        meta: {},
    },
    {
        zigbeeModel: ['HY0022-HY'],
        model: 'HS1CG-HY',
        vendor: 'Honyar',
        description: 'Gas sensor',
        extend: [
            m.iasZoneAlarm({
                "zoneType":"gas",
                "zoneAttributes":["alarm_1"]
            })
        ],
        meta: {},
    },
    {
        zigbeeModel: ['00041580'],
        model: 'IHW1213(AL)',
        vendor: 'Honyar',
        description: 'Curtain Motor',
        extend: [
            m.windowCovering({
                "controls":["lift"], 
                "coverInverted":true, 
                "stateSource":"lift", 
                "configureReporting": false
            })
        ],
        meta: {},
    },
    {
        zigbeeModel: ['HY0093'],
        model: 'IHG5201',
        vendor: 'Honyar',
        description: 'Door and window sensor',
        extend: [
            m.battery(),
            m.iasZoneAlarm({
                "zoneType":"contact",
                "zoneAttributes":["alarm_1","tamper","battery_low"]
            })
        ],
        meta: {},
    },


    {
        zigbeeModel: ["00500c35"],
        model: "U86K31ND6",
        vendor: "Honyar",
        description: "3 gang switch ",
        extend: [m.deviceEndpoints({endpoints: {left: 1, center: 2, right: 3}}), m.onOff({endpointNames: ["left", "center", "right"], powerOnBehavior: false})],
    },
    {
        zigbeeModel: ["HY0043"],
        model: "U86Z13A16-ZJH(HA)",
        vendor: "Honyar",
        description: "Smart Power Socket 16A (with power monitoring)",
        fromZigbee: [fz.on_off, fz.electrical_measurement, fz.metering],
        toZigbee: [tz.on_off],
        exposes: [e.switch(), e.power(), e.current(), e.voltage(), e.energy()],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genOnOff", "haElectricalMeasurement", "seMetering"]);
            await reporting.onOff(endpoint);
            await reporting.readEletricalMeasurementMultiplierDivisors(endpoint);
            await reporting.activePower(endpoint);
            await reporting.rmsCurrent(endpoint);
            await reporting.rmsVoltage(endpoint);
            await reporting.readMeteringMultiplierDivisor(endpoint);
            await reporting.currentSummDelivered(endpoint);
        },
    },
    {
        zigbeeModel: ["HY0157"],
        model: "U86Z223A10-ZJU01(GD)",
        vendor: "Honyar",
        description: "Smart power socket 10A with USB (with power monitoring)",
        fromZigbee: [fz.on_off, fz.electrical_measurement, fz.metering],
        toZigbee: [tz.on_off],
        exposes: [e.switch().withEndpoint("l1"), e.switch().withEndpoint("l2"), e.power(), e.current(), e.voltage(), e.energy()],
        meta: {multiEndpoint: true, multiEndpointSkip: ["energy", "current", "voltage", "power"]},
        endpoint: (device) => {
            return {l1: 1, l2: 2};
        },
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await tuya.configureMagicPacket(device, coordinatorEndpoint);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genOnOff", "haElectricalMeasurement", "seMetering"]);
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ["genOnOff"]);
            await reporting.activePower(endpoint, {min: 10, change: 10});
            await reporting.rmsCurrent(endpoint, {min: 10, change: 50});
            await reporting.rmsVoltage(endpoint, {min: 10, change: 10});
            await reporting.currentSummDelivered(endpoint, {min: 10});
            await reporting.readMeteringMultiplierDivisor(endpoint);
            endpoint.saveClusterAttributeKeyValue("seMetering", {divisor: 1000, multiplier: 1});
            endpoint.saveClusterAttributeKeyValue("haElectricalMeasurement", {
                acVoltageMultiplier: 1,
                acVoltageDivisor: 10,
                acCurrentMultiplier: 1,
                acCurrentDivisor: 1000,
                acPowerMultiplier: 1,
                acPowerDivisor: 10,
            });
            device.save();
        },
    },
    {
        zigbeeModel: ["HY0095"],
        model: "U2-86K11ND10-ZD",
        vendor: "Honyar",
        description: "1 gang switch",
        fromZigbee: [fz.on_off],
        toZigbee: [tz.on_off],
        exposes: [e.switch()],
        meta: {disableDefaultResponse: true},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genOnOff"]);
            await reporting.onOff(endpoint);
        },
    },
    {
        zigbeeModel: ["HY0096"],
        model: "U2-86K21ND10-ZD",
        vendor: "Honyar",
        description: "2 gang switch",
        fromZigbee: [fz.on_off],
        toZigbee: [tz.on_off],
        exposes: [e.switch().withEndpoint("left"), e.switch().withEndpoint("right")],
        endpoint: (device) => {
            return {left: 1, right: 2};
        },
        meta: {multiEndpoint: true, disableDefaultResponse: true},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint1 = device.getEndpoint(1);
            const endpoint2 = device.getEndpoint(2);
            await reporting.bind(endpoint1, coordinatorEndpoint, ["genOnOff"]);
            await reporting.onOff(endpoint1);
            await reporting.bind(endpoint2, coordinatorEndpoint, ["genOnOff"]);
            await reporting.onOff(endpoint2);
        },
    },
    {
        zigbeeModel: ["HY0097"],
        model: "U2-86K31ND10-ZD",
        vendor: "Honyar",
        description: "3 gang switch",
        fromZigbee: [fz.on_off],
        toZigbee: [tz.on_off],
        exposes: [e.switch().withEndpoint("left"), e.switch().withEndpoint("right"), e.switch().withEndpoint("center")],
        endpoint: (device) => {
            return {left: 1, center: 2, right: 3};
        },
        meta: {multiEndpoint: true, disableDefaultResponse: true},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint1 = device.getEndpoint(1);
            const endpoint2 = device.getEndpoint(2);
            const endpoint3 = device.getEndpoint(3);
            await reporting.bind(endpoint1, coordinatorEndpoint, ["genOnOff"]);
            await reporting.onOff(endpoint1);
            await reporting.bind(endpoint2, coordinatorEndpoint, ["genOnOff"]);
            await reporting.onOff(endpoint2);
            await reporting.bind(endpoint3, coordinatorEndpoint, ["genOnOff"]);
            await reporting.onOff(endpoint3);
        },
    },
];
