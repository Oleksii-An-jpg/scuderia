'use client';
import {FC, memo, useMemo} from "react";
import {useFormContext, useWatch} from "react-hook-form";
import {MambaRoadList} from "@/models";
import {GridItem, Heading} from "@chakra-ui/react";
import {decimalToTimeString} from "@/components/TimeInput";

const SummaryRow: FC = () => {
    const { control } = useFormContext<MambaRoadList>();

    // Use useWatch to subscribe to the itineraries array - this will trigger on any field change
    const itineraries = useWatch({
        control,
        name: "itineraries"
    });

    const summaryData = useMemo(() => {
        if (!itineraries || !Array.isArray(itineraries)) {
            return { hh: 0, sh: 0, mh: 0, ph: 0, total: 0, consumed: 0, remain: 0 };
        }

        let hh = 0, mh = 0, sh = 0, ph = 0, fuel = 0;

        itineraries.forEach((item) => {
            if (item) {
                hh += item.hh || 0;
                mh += item.mh || 0;
                sh += item.sh || 0;
                ph += item.ph || 0;
                fuel += item.fuel || 0;
            }
        });

        const consumed = Math.round((hh * 6.3 + mh * 31.2 + sh * 137 + ph * 253) * 100) / 100;
        const remain = Math.round((fuel - consumed) * 100) / 100;
        return { hh, sh, mh, ph, total: hh + sh + mh + ph, consumed, remain };
    }, [itineraries]);

    return (
        <>
            <GridItem colStart={3}>
                <Heading size="sm">Разом:</Heading>
            </GridItem>
            <GridItem><Heading textStyle="sm">{decimalToTimeString(summaryData.hh)}</Heading></GridItem>
            <GridItem><Heading textStyle="sm">{decimalToTimeString(summaryData.mh)}</Heading></GridItem>
            <GridItem><Heading textStyle="sm">{decimalToTimeString(summaryData.sh)}</Heading></GridItem>
            <GridItem><Heading textStyle="sm">{decimalToTimeString(summaryData.ph)}</Heading></GridItem>
            <GridItem><Heading textStyle="sm">{decimalToTimeString(summaryData.total)}</Heading></GridItem>
            <GridItem><Heading textStyle="sm">{summaryData.consumed}</Heading></GridItem>
        </>
    );
}

export default memo(SummaryRow);