// --- Types ---
import {
    bearing,
    Target,
    Coordinate,
    destination,
    distance,
    formatLat,
    formatLon,
    WaypointData,
    calculateTrackOffsets, getColumnName, formatWaypointLine
} from "@/lib/planning/types";

export interface SurveyOptions {
    speed: number;
    useBoxLeadins?: boolean;
    boxLeadinAngleThreshold?: number;
}

// --- Pattern Logic ---

export const parseTargets = (input: string): Target[] => {
    const lines = input.trim().split('\n').filter(l => {
        const trimmed = l.trim();
        return trimmed && !trimmed.startsWith('#');
    });
    return lines.map(line => {
        const parts = line.split(/\s+/);
        return {
            lat: parseFloat(parts[0]),
            lon: parseFloat(parts[1]),
            type: parts[2],
            id: parts[3],
            numTracks: 3,
            spacing: 5,
            bearing: 0
        };
    });
};

export const generateSurveyRoute = (targets: Target[], options: SurveyOptions): { output: string[], waypoints: WaypointData[] } => {
    const { speed, useBoxLeadins = false, boxLeadinAngleThreshold = 45 } = options;
    const waypoints: WaypointData[] = [];
    let lastPoint: Coordinate | null = null;
    const trackLength = 200;
    const turnExtension = 60;

    targets.forEach((target, idx) => {
        const letter = getColumnName(idx);
        const tracks = calculateTrackOffsets(target.numTracks, target.spacing);
        const perpBearing = (target.bearing + 90) % 360;

        const trackSegments: { start: Coordinate, end: Coordinate, offset: number }[] = [];

        for (let i = 0; i < tracks.length; i++) {
            const offset = tracks[i];
            const centerPt = destination(target.lat, target.lon, offset, perpBearing);
            const isForward = i % 2 === 0;
            const heading = isForward ? target.bearing : (target.bearing + 180) % 360;
            const backHeading = (heading + 180) % 360;
            const tStart = destination(centerPt.lat, centerPt.lon, trackLength / 2, backHeading);
            const tEnd = destination(centerPt.lat, centerPt.lon, trackLength / 2, heading);
            trackSegments.push({ start: tStart, end: tEnd, offset });
        }

        for (let i = 0; i < trackSegments.length; i++) {
            const seg = trackSegments[i];

            if (i === 0) {
                const leadinTag = `lead_${letter}`;
                const trackBrg = bearing(seg.start.lat, seg.start.lon, seg.end.lat, seg.end.lon);

                if (idx === 0) {
                    waypoints.push({
                        tag: leadinTag,
                        lat: formatLat(seg.start.lat),
                        lon: formatLon(seg.start.lon),
                        latNum: seg.start.lat,
                        lonNum: seg.start.lon,
                        isLeadin: true
                    });
                } else {
                    const dist = distance(lastPoint!.lat, lastPoint!.lon, seg.start.lat, seg.start.lon);
                    const brg = bearing(lastPoint!.lat, lastPoint!.lon, seg.start.lat, seg.start.lon);

                    // Calculate angle difference between approach and track
                    let angleDiff = trackBrg - brg;
                    if (angleDiff > 180) angleDiff -= 360;
                    if (angleDiff < -180) angleDiff += 360;

                    // If box leadins enabled and approach angle is too sharp, add box pattern
                    if (useBoxLeadins && Math.abs(angleDiff) > boxLeadinAngleThreshold) {
                        // Create a box approach similar to turn pattern
                        const approachDist = turnExtension;
                        const reverseBrg = (trackBrg + 180) % 360;

                        // Point 1: approach from behind the track
                        const p1 = destination(seg.start.lat, seg.start.lon, approachDist, reverseBrg);

                        // Point 2: offset perpendicular to track
                        const perpOffset = angleDiff > 0 ? -90 : 90;
                        const perpBrg = (trackBrg + perpOffset + 360) % 360;
                        const p2 = destination(p1.lat, p1.lon, approachDist, perpBrg);

                        // Point 3: move towards the approach line from current position
                        const d1 = distance(lastPoint!.lat, lastPoint!.lon, p2.lat, p2.lon);
                        const b1 = bearing(lastPoint!.lat, lastPoint!.lon, p2.lat, p2.lon);

                        waypoints.push({
                            tag: `${leadinTag}_1`,
                            lat: formatLat(p2.lat),
                            lon: formatLon(p2.lon),
                            latNum: p2.lat,
                            lonNum: p2.lon,
                            bearing: b1,
                            time: Math.round(d1 / speed),
                            distance: d1,
                            isLeadin: true
                        });

                        const d2 = distance(p2.lat, p2.lon, p1.lat, p1.lon);
                        const b2 = bearing(p2.lat, p2.lon, p1.lat, p1.lon);

                        waypoints.push({
                            tag: `${leadinTag}_2`,
                            lat: formatLat(p1.lat),
                            lon: formatLon(p1.lon),
                            latNum: p1.lat,
                            lonNum: p1.lon,
                            bearing: b2,
                            time: Math.round(d2 / speed),
                            distance: d2,
                            isLeadin: true
                        });

                        const d3 = distance(p1.lat, p1.lon, seg.start.lat, seg.start.lon);

                        waypoints.push({
                            tag: `${leadinTag}_3`,
                            lat: formatLat(seg.start.lat),
                            lon: formatLon(seg.start.lon),
                            latNum: seg.start.lat,
                            lonNum: seg.start.lon,
                            bearing: trackBrg,
                            time: Math.round(d3 / speed),
                            distance: d3,
                            isLeadin: true
                        });
                    } else {
                        // Straight approach - angle is acceptable
                        const time = Math.round(dist / speed);
                        waypoints.push({
                            tag: leadinTag,
                            lat: formatLat(seg.start.lat),
                            lon: formatLon(seg.start.lon),
                            latNum: seg.start.lat,
                            lonNum: seg.start.lon,
                            bearing: brg,
                            time,
                            distance: dist,
                            isLeadin: true
                        });
                    }
                }
            }

            const trackTag = `${letter}_${i + 1}`;
            const trackBrg = bearing(seg.start.lat, seg.start.lon, seg.end.lat, seg.end.lon);
            const trackDist = distance(seg.start.lat, seg.start.lon, seg.end.lat, seg.end.lon);
            const trackTime = Math.round(trackDist / speed);
            waypoints.push({
                tag: trackTag,
                lat: formatLat(seg.end.lat),
                lon: formatLon(seg.end.lon),
                latNum: seg.end.lat,
                lonNum: seg.end.lon,
                bearing: trackBrg,
                time: trackTime,
                distance: trackDist,
                isFirstGall: true
            });

            if (i < trackSegments.length - 1) {
                const nextSeg = trackSegments[i + 1];
                const turnTagBase = `t${trackTag}`;
                const currentHdg = trackBrg;

                const isNextTrackRight = nextSeg.offset > seg.offset;
                const turnAwayBrg = isNextTrackRight
                    ? (currentHdg - 90 + 360) % 360
                    : (currentHdg + 90) % 360;
                const turnTowardsBrg = (turnAwayBrg + 180) % 360;

                const p1 = destination(seg.end.lat, seg.end.lon, turnExtension, turnAwayBrg);
                const d1 = distance(seg.end.lat, seg.end.lon, p1.lat, p1.lon);

                const p2 = destination(p1.lat, p1.lon, turnExtension, currentHdg);
                const d2 = distance(p1.lat, p1.lon, p2.lat, p2.lon);

                // Check if we turned in the same direction as where the next track is
                const bearingToNextTrack = bearing(seg.end.lat, seg.end.lon, nextSeg.start.lat, nextSeg.start.lon);
                let angleDiff = bearingToNextTrack - turnAwayBrg;
                if (angleDiff > 180) angleDiff -= 360;
                if (angleDiff < -180) angleDiff += 360;

                const turnedTowardsNext = Math.abs(angleDiff) < 90;
                const spacingDiff = Math.abs(nextSeg.offset - seg.offset);
                const crossDist = turnedTowardsNext
                    ? turnExtension - spacingDiff
                    : turnExtension + spacingDiff;
                const p3 = destination(p2.lat, p2.lon, crossDist, turnTowardsBrg);
                const d3 = distance(p2.lat, p2.lon, p3.lat, p3.lon);

                waypoints.push({
                    tag: `${turnTagBase}_1`,
                    lat: formatLat(p1.lat),
                    lon: formatLon(p1.lon),
                    latNum: p1.lat,
                    lonNum: p1.lon,
                    bearing: turnAwayBrg,
                    time: Math.round(d1 / speed),
                    distance: d1,
                    isFirstTurn: true,
                });

                waypoints.push({
                    tag: `${turnTagBase}_2`,
                    lat: formatLat(p2.lat),
                    lon: formatLon(p2.lon),
                    latNum: p2.lat,
                    lonNum: p2.lon,
                    bearing: currentHdg,
                    time: Math.round(d2 / speed),
                    distance: d2,
                });

                waypoints.push({
                    tag: `${turnTagBase}_3`,
                    lat: formatLat(p3.lat),
                    lon: formatLon(p3.lon),
                    latNum: p3.lat,
                    lonNum: p3.lon,
                    bearing: turnTowardsBrg,
                    time: Math.round(d3 / speed),
                    distance: d3,
                });

                const d4 = distance(p3.lat, p3.lon, nextSeg.start.lat, nextSeg.start.lon);
                const b4 = bearing(p3.lat, p3.lon, nextSeg.start.lat, nextSeg.start.lon);

                waypoints.push({
                    tag: `${turnTagBase}_4`,
                    lat: formatLat(nextSeg.start.lat),
                    lon: formatLon(nextSeg.start.lon),
                    latNum: nextSeg.start.lat,
                    lonNum: nextSeg.start.lon,
                    bearing: b4,
                    time: Math.round(d4 / speed),
                    distance: d4
                });

                lastPoint = nextSeg.start;
            } else {
                lastPoint = seg.end;
            }
        }
    });

    const output: string[] = [];
    output.push('#No:Tag       Depth    Alt DMo   Latitude    Longitude Course GMo  RPM Speed SMo   Dur   Dist  Flags');
    output.push('');

    let prevBearing: number | undefined;
    let currentPattern = '';

    waypoints.forEach((wp) => {
        if (wp.isLeadin) {
            const newPattern = wp.tag.replace(/lead/, '').replace(/_\d+$/, '');
            if (currentPattern && newPattern !== currentPattern) {
                output.push('');
            }
            currentPattern = newPattern;
        }
        const line = formatWaypointLine(wp, prevBearing);
        output.push(line);
        if (wp.bearing !== undefined) {
            prevBearing = wp.bearing;
        }
    });

    return { output, waypoints };
};