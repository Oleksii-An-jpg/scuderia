import {
    SearchArea,
    Coordinate, // Ensure generateHuginMP isn't imported from types if it's declared here
} from "./types";
import L, { LatLngLiteral } from "leaflet";
import 'leaflet-geometryutil';

const dmToDecimal = (degrees: number, minutes: number, hemisphere: string): number => {
    let decimal = degrees + (minutes / 60);
    if (hemisphere === 'S' || hemisphere === 'W') {
        decimal = -decimal;
    }
    return decimal;
};

export type Waypoint = LatLngLiteral & {
    tag: string;
    bearing: number;
    distance?: number;
    duration?: number;
    isLeadin?: boolean;
}

function getDistanceOnBearing(latlngA: LatLngLiteral, latlngB: LatLngLiteral, latlngC: L.LatLng, bearing: number) {
    const x1 = latlngA.lng, y1 = latlngA.lat;
    const x2 = latlngB.lng, y2 = latlngB.lat;
    const xc = latlngC.lng, yc = latlngC.lat;

    const a = y1 - y2;
    const b = x2 - x1;
    const c = x1 * y2 - x2 * y1;

    const angleRad = (90 - bearing) * (Math.PI / 180);
    const denom = a * Math.cos(angleRad) + b * Math.sin(angleRad);

    if (Math.abs(denom) < 1e-10) return null;

    const dDegrees = -(a * xc + b * yc + c) / denom;

    if (dDegrees < 0) return null;

    const cosA = Math.cos(angleRad);
    const sinA = Math.sin(angleRad);

    const intersectLng = xc + dDegrees * cosA;
    const intersectLat = yc + dDegrees * sinA;
    const intersectLatLng = L.latLng(intersectLat, intersectLng);

    return latlngC.distanceTo(intersectLatLng);
}

export const parseInputToCoordinates = (input: string): Coordinate[] => {
    const coordinates: Coordinate[] = [];
    const coordRegex = /(\d+)°\s*([\d.]+)'([NSEW])/g;
    const lines = input.trim().split('\n');

    for (const line of lines) {
        const matches = [...line.matchAll(coordRegex)];
        if (matches.length >= 2) {
            const latMatch = matches[0];
            const lonMatch = matches[1];

            const lat = dmToDecimal(parseFloat(latMatch[1]), parseFloat(latMatch[2]), latMatch[3]);
            const lon = dmToDecimal(parseFloat(lonMatch[1]), parseFloat(lonMatch[2]), lonMatch[3]);

            coordinates.push({ lat, lon });
        }
    }
    return coordinates;
};

export const generateHuginMP = (waypoints: Waypoint[], speed: number): string[] => {
    const output: string[] = ['MP11', '#', '# HUGIN Survey Plan', '#'];
    output.push('#No:Tag       Depth    Alt DMo   Latitude    Longitude Course GMo  RPM Speed SMo   Dur   Dist  Flags');
    output.push('');

    const knotsSpeed = (speed * 1.94384).toFixed(1);
    const firstTrack = waypoints.find(wp => !wp.isLeadin);
    const courseA1 = firstTrack?.bearing ? `${Math.round(firstTrack.bearing)}.0`.padStart(7) : '      -';

    const headerRows = [
        `:start         0.0   15.0  D            -             - ${courseA1}  C     =  0.0k  R    600       -`,
        `:sas_on         =      =   =            -             -      =  =     =     =  =      2       -  SASPowerOn`,
        `:em_on          =      =   =            -             -      =  =     =     =  =      2       -  EMPowerOn`,
        `:crit_h         =      =   =            -             -      =  =     =     =  =      2       -  CritHeight3`,
        `:safe_h         =      =   =            -             -      =  =     =     =  =      2       -  SafeDist6`,
        `:flntu_on       =      =   =            -             -      =  =     =     =  =      2       -  FLNTUPowerOn`,
        `:fls_on         =      =   =            -             -      =  =     =     =  =      2       -  FLSPowerOn`,
        `:roll_ctr       =      =   =            -             -      =  =     =     =  =      2       -  RollCtrlOn`,
        `:dist           =      =   =            -             -      =  =     =     =  =      2       -  DistTrigger`,
        `:speed_up       =      =   =            -             -      =  =   200     =  R     60       -`,
        `:dive          5.0     =   D            -             -      =  =     =     =  =     60       -`,
        `:sas_hp         =      =   =            -             -      =  =     =     =  =      2       -  SASHighPower`,
        `:sas_ol4        =      =   =            -             -      =  =     =     =  =      2       -  SASOverlap4`,
        `:sas_sw         =      =   =            -             -      =  =     =     =  =      2       -  SASMode1`,
        `:sas_imp        =      =   =            -             -      =  =     =     =  =      2       -  SASIMSOn`,
        `:sas_act        =      =   =            -             -      =  =     =     =  =      2       -  SASOn`,
        `:em_ext         =      =   =            -             -      =  =     =     =  =      2       -  EM400Ext`,
        `:em_act         =      =   =            -             -      =  =     =     =  =      2       -  EMOn`
    ];

    output.push(...headerRows);

    const pad = (str: string | number, len: number, dir: 'L' | 'R' = 'L') => {
        const s = String(str);
        return dir === 'L' ? s.padStart(len, ' ') : s.padEnd(len, ' ');
    };

    const formatCoord = (decimal: number, isLat: boolean): string => {
        const absDec = Math.abs(decimal);
        const degrees = Math.floor(absDec);
        const minutes = (absDec - degrees) * 60;
        const dir = isLat ? (decimal >= 0 ? 'N' : 'S') : (decimal >= 0 ? 'E' : 'W');
        const degStr = degrees.toString().padStart(isLat ? 2 : 3, '0');
        const minStr = minutes.toFixed(4).padStart(7, '0');
        return `${degStr}:${minStr}${dir}`;
    };

    const buildRow = (
        tag: string, depth: string, alt: string, dmo: string,
        lat: string, lng: string, course: string,
        gmo: string, rpm: string, speed: string, smo: string,
        dur: string, dist: string, flags: string
    ) => {
        return `:${pad(tag, 14, 'R')} ${pad(depth, 6)}   ${pad(alt, 4)} ${dmo}  ${lat} ${lng} ${pad(course, 5)}  ${gmo}  ${pad(rpm, 4)} ${pad(speed, 5)}  ${smo} ${pad(dur, 6)} ${pad(dist, 7)}  ${flags}`.trimEnd();
    };

    let prevWP: L.LatLng | null = null;

    for (let idx = 0; idx < waypoints.length; idx++) {
        const wp = waypoints[idx];
        const currentLatLng = new L.LatLng(wp.lat, wp.lng);

        const latStr = formatCoord(wp.lat, true);
        const lngStr = formatCoord(wp.lng, false);

        let courseVal = Math.round(wp.bearing) % 360;
        if (courseVal < 0) courseVal += 360;
        let courseStr = `(${courseVal.toString().padStart(3, '0')})`;

        let dist = '-';
        let dur = '-';

        if (prevWP) {
            dist = `(${wp.distance})`;
            dur = `(${wp.duration})`;
        }

        if (wp.tag === 'leadin_a') {
            output.push(buildRow(wp.tag, '100.0', '18.0', 'T', latStr, lngStr, '=', '=', '=', `${knotsSpeed}k`, 'S', '60', '-', 'auto'));
        } else if (wp.tag === 'leadin_b') {
            output.push('');
            output.push(buildRow(wp.tag, '=', '=', '=', latStr, lngStr, courseStr, '=', '=', '=', '=', dur, dist, ''));
        } else {
            output.push(buildRow(wp.tag, '=', '=', '=', latStr, lngStr, courseStr, '=', '=', '=', '=', dur, dist, ''));
        }

        prevWP = currentLatLng;
    }

    return output;
};

export const generateSearchRoute = (
    area: SearchArea,
    flip: boolean = false,
): {
    waypoints: Waypoint[];
    output: string[];
} => {
    const nadir = area.altitude * 1.25;
    const range = area.altitude * 8.44;
    const nearRange = (nadir + range) / 2;
    const farRange = (range * 2) - area.overlap
    const [a, b, c, d] = area.corners.map(cornet => new L.LatLng(cornet.lat, cornet.lon)).map((latLng, index, self) => ({
        latLng,
        index,
        distance: latLng.distanceTo(self[index === self.length - 1 ? 0 : index + 1])
    }));

    const bearings = [
        L.GeometryUtil.bearing(a.latLng, b.latLng),
        L.GeometryUtil.bearing(b.latLng, c.latLng),
        L.GeometryUtil.bearing(c.latLng, d.latLng),
        L.GeometryUtil.bearing(a.latLng, d.latLng),
    ];

    const centers = [
        L.GeometryUtil.destination(a.latLng, bearings[0], a.distance / 2),
        L.GeometryUtil.destination(b.latLng, bearings[1], b.distance / 2),
        L.GeometryUtil.destination(c.latLng, bearings[2], c.distance / 2),
        L.GeometryUtil.destination(d.latLng, bearings[3], d.distance / 2),
    ];

    const start = L.GeometryUtil.destination(centers[0], bearings[1] + 180, area.overlap);

    const waypoints: Waypoint[] = [{
        ...start,
        tag: 'leadin_a',
        bearing: bearings[1] + 180,
        isLeadin: true,
    }];

    const distance = Math.round(centers[0].distanceTo(centers[2]) + area.overlap * 2);
    waypoints.push({
        ...L.GeometryUtil.destination(waypoints[0], bearings[3], centers[0].distanceTo(centers[2]) + area.overlap * 2),
        tag: 'a_1',
        bearing: bearings[3],
        duration: Math.round(distance / area.speed),
        distance
    });

    let i = 1;
    let legCounterA = 1;

    for (;;) {
        const lastWP = new L.LatLng(waypoints[waypoints.length - 1].lat, waypoints[waypoints.length - 1].lng);
        const r = getDistanceOnBearing(a.latLng, d.latLng, lastWP, bearings[2]);
        const l = getDistanceOnBearing(a.latLng, d.latLng, lastWP, bearings[0]);

        if (waypoints.length % 4 === 0 && ((r && r < farRange) || (l && l < farRange))) {
            break;
        }

        if (i % 2 === 0) {
            // --- LONG LEG ---
            legCounterA++;
            const currentBearing = (i % 4 === 0) ? bearings[3] : (bearings[3] + 180);
            const borderA = (i % 4 === 0) ? c.latLng : a.latLng;
            const borderB = (i % 4 === 0) ? d.latLng : b.latLng;

            const dist = getDistanceOnBearing(borderA, borderB, lastWP, currentBearing);
            if (!dist) throw new Error('Could not find distance in waypoints.');
            const distance = Math.round(dist + area.overlap);
            const duration = Math.round(distance / area.speed);

            waypoints.push({
                ...L.GeometryUtil.destination(lastWP, currentBearing, distance),
                tag: `a_${legCounterA}`,
                bearing: currentBearing,
                distance,
                duration
            });
        } else {
            // --- STEP OVER ---
            const isLongStep = ((i + 1) / 2) % 2 === 0;
            const stepDist = Math.round(isLongStep ? farRange : nearRange);
            const duration = Math.round(stepDist / area.speed);

            waypoints.push({
                ...L.GeometryUtil.destination(lastWP, bearings[2], stepDist),
                tag: `ta_${legCounterA}`,
                bearing: bearings[2],
                duration,
                distance: stepDist,
            });
        }

        i++;
    }

    const asd = new L.LatLng(waypoints[waypoints.length - 1].lat, waypoints[waypoints.length - 1].lng);
    const distLeadB = Math.round(asd.distanceTo(start) + farRange);
    const durLeadB = Math.round(distLeadB / area.speed)
    waypoints.push({
        ...L.GeometryUtil.destination(asd, bearings[0], distLeadB),
        tag: 'leadin_b',
        bearing: bearings[0],
        isLeadin: true,
        distance: distLeadB,
        duration: durLeadB
    });

    const distB = Math.round(centers[0].distanceTo(centers[2]) + area.overlap * 2);
    const durB = Math.round(distance / area.speed);
    waypoints.push({
        ...L.GeometryUtil.destination(waypoints[waypoints.length - 1], bearings[1], distB),
        tag: 'b_1',
        bearing: bearings[1],
        distance: distB,
        duration: durB
    });

    let j = 1;
    let legCounterB = 1;

    for (;;) {
        const lastWP = new L.LatLng(waypoints[waypoints.length - 1].lat, waypoints[waypoints.length - 1].lng);
        const r = getDistanceOnBearing(b.latLng, c.latLng, lastWP, bearings[0]);
        const l = getDistanceOnBearing(b.latLng, c.latLng, lastWP, bearings[2]);

        if (waypoints.length % 4 === 0 && ((r && r < farRange) || (l && l < farRange))) {
            break;
        }

        if (j % 2 === 0) {
            // --- LONG LEG ---
            legCounterB++;
            const currentBearing = (j % 4 === 0) ? bearings[1] : (bearings[1] + 180);
            const borderA = (j % 4 === 0) ? c.latLng : a.latLng;
            const borderB = (j % 4 === 0) ? d.latLng : b.latLng;

            const dist = getDistanceOnBearing(borderA, borderB, lastWP, currentBearing);
            if (!dist) throw new Error('Could not find distance in waypoints.');
            const distance = Math.round(dist + area.overlap);
            const duration = Math.round(distance / area.speed);

            waypoints.push({
                ...L.GeometryUtil.destination(lastWP, currentBearing, distance),
                tag: `b_${legCounterB}`,
                bearing: currentBearing,
                distance,
                duration
            });
        } else {
            // --- STEP OVER ---
            const isLongStep = ((j + 1) / 2) % 2 === 0;
            const stepDist = Math.round(isLongStep ? farRange : nearRange);
            const duration = Math.round(stepDist / area.speed);

            waypoints.push({
                ...L.GeometryUtil.destination(lastWP, bearings[0], stepDist),
                tag: `tb_${legCounterB}`,
                bearing: bearings[0],
                distance: stepDist,
                duration
            });
        }

        j++;
    }

    const areaBounds = L.latLngBounds([a.latLng, b.latLng, c.latLng, d.latLng]);
    const areaCenter = areaBounds.getCenter();

    const wpBounds = L.latLngBounds(waypoints.map(w => [w.lat, w.lng]));
    const wpCenter = wpBounds.getCenter();

    const processedWaypoints = waypoints.map(wp => {
        let newLat = wp.lat;
        let newLng = wp.lng;

        if (flip) {
            newLat = wpCenter.lat - (wp.lat - wpCenter.lat);
            newLng = wpCenter.lng - (wp.lng - wpCenter.lng);
        }

        return { ...wp, lat: newLat, lng: newLng };
    });

    const finalWpBounds = L.latLngBounds(processedWaypoints.map(w => [w.lat, w.lng]));
    const finalWpCenter = finalWpBounds.getCenter();

    const latShift = areaCenter.lat - finalWpCenter.lat;
    const lngShift = areaCenter.lng - finalWpCenter.lng;

    const result = processedWaypoints.map(wp => ({
        ...wp,
        lat: wp.lat + latShift,
        lng: wp.lng + lngShift
    }));

    return {
        waypoints: result,
        output: generateHuginMP(result, area.speed)
    }
};
