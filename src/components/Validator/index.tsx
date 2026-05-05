'use client'

import { FC, useState, useCallback, useRef } from "react";
import {
    Box,
    Button,
    Heading,
    HStack,
    VStack,
    Text,
    Badge,
    Textarea,
    Table,
} from "@chakra-ui/react";

// ─── Column indices ────────────────────────────────────────────────────────────
// Header: Depth Alt DMo Lat Lon Course GMo RPM Speed SMo Dur Dist [Flags…]
const COL = {
    DEPTH: 0,
    ALT: 1,
    DMO: 2,
    LAT: 3,
    LON: 4,
    COURSE: 5,
    GMO: 6,
    RPM: 7,
    SPEED: 8,
    SMO: 9,
    DUR: 10,
    DIST: 11,
    FLAGS_START: 12,
} as const;

// ─── Types ────────────────────────────────────────────────────────────────────

type ParsedRow = {
    tag: string;
    raw: string;
    parts: string[];
    errors: string[];
    warns: string[];
    lineNum: number;
};

type CommentRow = {
    raw: string;
    isComment: true;
};

type Row = ParsedRow | CommentRow;

// ─── Required tag groups ───────────────────────────────────────────────────────

const REQUIRED_INIT_TAGS = [
    "sas_on", "em_on", "crit_h", "safe_h",
    "flntu_on", "fls_on", "roll_ctr", "dist",
];

const REQUIRED_POST_TAGS = [
    "sas_hp", "sas_ol4", "sas_sw", "sas_imp",
    "sas_act", "em_ext", "em_act",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function num(val: string | undefined): number | null {
    if (!val || val === "-" || val === "=") return null;
    const v = parseFloat(val.replace(/[()]/g, ""));
    return isNaN(v) ? null : v;
}

function getFlags(parts: string[]): string {
    return parts.slice(COL.FLAGS_START).filter(f => f !== "-").join(" ");
}

// ─── Validator ────────────────────────────────────────────────────────────────

export function validateMissionPlan(input: string): {
    rows: Row[];
    errorCount: number;
    warnCount: number;
} {
    const lines = input.split("\n");
    const rows: Row[] = [];
    let dataIdx = 0;

    for (const rawLine of lines) {
        const raw = rawLine.replace(/\r/g, "");
        if (!raw.trim()) continue;
        if (raw.trimStart().startsWith("#")) {
            rows.push({ raw, isComment: true });
            continue;
        }
        const tokens = raw.trim().split(/\s+/);
        if (!tokens[0].startsWith(":")) continue;
        dataIdx++;
        rows.push({
            tag: tokens[0].slice(1),
            raw,
            // parts[0] = Depth, parts[1] = Alt, …  exactly matching COL constants
            parts: tokens.slice(1),
            errors: [],
            warns: [],
            lineNum: dataIdx,
        });
    }

    const data = rows.filter((r): r is ParsedRow => !("isComment" in r));

    // ── Unique tags ──────────────────────────────────────────────────────────
    const tagCount: Record<string, number> = {};
    for (const r of data) tagCount[r.tag] = (tagCount[r.tag] ?? 0) + 1;
    for (const r of data) {
        if (tagCount[r.tag] > 1) r.errors.push("duplicate tag");
    }

    // ── Init block: required tags with dur=2 ─────────────────────────────────
    for (const t of REQUIRED_INIT_TAGS) {
        const r = data.find(r => r.tag === t);
        if (!r) continue;
        const dur = num(r.parts[COL.DUR]);
        if (dur !== 2) r.errors.push(`duration must be 2 (got ${r.parts[COL.DUR]})`);
    }

    // ── ≥2 min gap between :dist and post-init block ─────────────────────────
    const distIdx = data.findIndex(r => r.tag === "dist");
    const postFirstIdx = data.findIndex(r => REQUIRED_POST_TAGS.includes(r.tag));

    if (distIdx !== -1 && postFirstIdx !== -1 && postFirstIdx > distIdx) {
        let gapSec = 0;
        for (let i = distIdx + 1; i < postFirstIdx; i++) {
            gapSec += num(data[i].parts[COL.DUR]) ?? 0;
        }
        if (gapSec < 120) {
            data[postFirstIdx].errors.push(
                `gap before post-init block must be ≥ 2 min (got ${gapSec}s)`
            );
        }
    }

    // ── Post-init block: required tags with dur=2 ────────────────────────────
    for (const t of REQUIRED_POST_TAGS) {
        const r = data.find(r => r.tag === t);
        if (!r) continue;
        const dur = num(r.parts[COL.DUR]);
        if (dur !== 2) r.errors.push(`duration must be 2 (got ${r.parts[COL.DUR]})`);
    }

    // ── Per-row rules ─────────────────────────────────────────────────────────
    for (let i = 0; i < data.length; i++) {
        const r = data[i];
        const p = r.parts;
        const dmo = p[COL.DMO];
        const smo = p[COL.SMO];
        const rpm = p[COL.RPM];
        const speed = p[COL.SPEED];
        const f = getFlags(p);

        // leadin: T mode → speed (k); must have 'auto'
        if (r.tag === "leadin") {
            if (dmo === "T") {
                if (speed !== "=" && !speed.endsWith("k")) {
                    r.errors.push("leadin T mode must use speed control (k), not RPM");
                }
            }
            if (!f.includes("auto")) r.errors.push(`leadin missing "auto" flag`);
        }

        // D mode → RPM control (R or inherited =)
        if (dmo === "D" && smo !== "R" && smo !== "=" && smo !== "-") {
            r.errors.push(`depth (D) mode must use RPM control (R), got "${smo}"`);
        }

        // Surface lines → 160 RPM
        if (r.tag.startsWith("surf")) {
            const rpmVal = num(rpm);
            if (rpmVal !== null && rpmVal !== 160) {
                r.errors.push(`surface RPM must be 160 (got ${rpm})`);
            }
        }

        // home → 'uuv' and 'SASOff'
        if (r.tag === "home") {
            if (!f.includes("uuv")) r.errors.push(`home missing "uuv" flag`);
            if (!f.includes("SASOff")) r.errors.push(`home missing "SASOff" flag`);
        }

        // 5 m dive → preceding line must set 200 RPM
        if (num(p[COL.DEPTH]) === 5) {
            const prev = data[i - 1];
            if (!prev) {
                r.warns.push("no preceding line — expected 200 RPM pre-dive setup");
            } else {
                const prevRpm = num(prev.parts[COL.RPM]);
                if (prevRpm !== 200) {
                    r.warns.push(
                        `preceding line should set 200 RPM for dive momentum (got ${prev.parts[COL.RPM] ?? "="})`
                    );
                }
            }
        }
    }

    const errorCount = data.reduce((s, r) => s + r.errors.length, 0);
    const warnCount = data.reduce((s, r) => s + r.warns.length, 0);
    return { rows, errorCount, warnCount };
}

// ─── Table column headers (matches COL order) ─────────────────────────────────

const COL_HEADERS = [
    "Depth", "Alt", "DMo", "Lat", "Lon",
    "Course", "GMo", "RPM", "Speed", "SMo",
    "Dur", "Dist", "Flags",
];

// ─── Row component ────────────────────────────────────────────────────────────

function DataRow({ r }: { r: ParsedRow }) {
    const hasErr = r.errors.length > 0;
    const hasWarn = r.warns.length > 0;
    const flagStr = getFlags(r.parts);

    return (
        <Table.Row bg={hasErr ? "red.subtle" : hasWarn ? "orange.subtle" : undefined}>
            <Table.Cell color="fg.muted" fontFamily="mono" fontSize="xs" px={2} py={1}>
                {r.lineNum}
            </Table.Cell>
            <Table.Cell fontWeight="medium" fontFamily="mono" fontSize="xs" px={2} py={1} whiteSpace="nowrap">
                {r.tag}
            </Table.Cell>
            {r.parts.slice(0, COL.FLAGS_START).map((val, i) => (
                <Table.Cell key={i} fontFamily="mono" fontSize="xs" color="fg.muted" px={2} py={1} whiteSpace="nowrap">
                    {val}
                </Table.Cell>
            ))}
            <Table.Cell fontFamily="mono" fontSize="xs" color="fg.muted" px={2} py={1} whiteSpace="nowrap">
                {flagStr || "—"}
            </Table.Cell>
            <Table.Cell px={2} py={1} minW="240px">
                <HStack gap={1} flexWrap="wrap">
                    {r.errors.map((e, i) => (
                        <Badge key={i} colorPalette="red" size="sm">{e}</Badge>
                    ))}
                    {r.warns.map((w, i) => (
                        <Badge key={i} colorPalette="orange" size="sm">{w}</Badge>
                    ))}
                </HStack>
            </Table.Cell>
        </Table.Row>
    );
}

// ─── Main component ───────────────────────────────────────────────────────────

const MissionValidator: FC = () => {
    const [text, setText] = useState("");
    const [result, setResult] = useState<ReturnType<typeof validateMissionPlan> | null>(null);
    const fileRef = useRef<HTMLInputElement>(null);

    const run = useCallback(() => {
        if (!text.trim()) return;
        setResult(validateMissionPlan(text));
    }, [text]);

    const onFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = ev => {
            const t = ev.target?.result as string;
            setText(t);
            setResult(validateMissionPlan(t));
        };
        reader.readAsText(file);
    }, []);

    const totalWaypoints = result
        ? result.rows.filter((r): r is ParsedRow => !("isComment" in r)).length
        : 0;

    return (
        <VStack align="stretch" gap={4}>
            <Heading size="md">Mission Plan Validator</Heading>

            <VStack align="stretch" gap={3}>
                <HStack gap={2}>
                    <input
                        ref={fileRef}
                        type="file"
                        accept=".mp,.txt"
                        style={{ display: "none" }}
                        onChange={onFile}
                    />
                    <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()}>
                        Open .mp file
                    </Button>
                    <Button size="sm" colorPalette="blue" onClick={run} disabled={!text.trim()}>
                        Validate
                    </Button>
                </HStack>

                <Textarea
                    value={text}
                    onChange={e => setText(e.target.value)}
                    placeholder="Paste mission plan here or open a .mp file…"
                    rows={8}
                    fontFamily="mono"
                    fontSize="xs"
                />
            </VStack>

            {result && (
                <VStack align="stretch" gap={3}>
                    <HStack gap={3} flexWrap="wrap">
                        <Badge colorPalette={result.errorCount > 0 ? "red" : "green"} size="lg">
                            {result.errorCount} error{result.errorCount !== 1 ? "s" : ""}
                        </Badge>
                        <Badge colorPalette={result.warnCount > 0 ? "orange" : "green"} size="lg">
                            {result.warnCount} warning{result.warnCount !== 1 ? "s" : ""}
                        </Badge>
                        <Text fontSize="sm" color="fg.muted">{totalWaypoints} waypoints</Text>
                    </HStack>

                    <Box overflowX="auto" borderWidth="1px" borderRadius="md" borderColor="border.subtle">
                        <Table.Root size="sm">
                            <Table.Header>
                                <Table.Row bg="bg.subtle">
                                    <Table.ColumnHeader px={2} py={2} fontSize="xs">#</Table.ColumnHeader>
                                    <Table.ColumnHeader px={2} py={2} fontSize="xs">Tag</Table.ColumnHeader>
                                    {COL_HEADERS.map(h => (
                                        <Table.ColumnHeader key={h} px={2} py={2} fontSize="xs" whiteSpace="nowrap">
                                            {h}
                                        </Table.ColumnHeader>
                                    ))}
                                    <Table.ColumnHeader px={2} py={2} fontSize="xs">Errors / Warnings</Table.ColumnHeader>
                                </Table.Row>
                            </Table.Header>
                            <Table.Body>
                                {result.rows.map((r, i) => {
                                    if ("isComment" in r) {
                                        const trimmed = r.raw.trim();
                                        if (!trimmed || trimmed === "#") return null;
                                        return (
                                            <Table.Row key={i} bg="bg.subtle">
                                                <Table.Cell
                                                    colSpan={COL_HEADERS.length + 3}
                                                    px={2}
                                                    py={1}
                                                    fontFamily="mono"
                                                    fontSize="xs"
                                                    color="fg.subtle"
                                                >
                                                    {trimmed}
                                                </Table.Cell>
                                            </Table.Row>
                                        );
                                    }
                                    return <DataRow key={i} r={r} />;
                                })}
                            </Table.Body>
                        </Table.Root>
                    </Box>
                </VStack>
            )}
        </VStack>
    );
};

export default MissionValidator;
