'use client';
import {FC, memo, useMemo} from "react";
import {GridItem, Heading} from "@chakra-ui/react";
import {decimalToTimeString} from "@/components/TimeInput";
import {KMARRoadListUIModel} from "@/models/mamba";

type SummaryProps = KMARRoadListUIModel;

const Summary: FC<SummaryProps> = ({ itineraries, hours, fuel }) => {
    const { hh, mh, sh } = useMemo(() => {
        return itineraries.reduce((sum, it) => {
            sum.hh += (it.hh || 0);
            sum.mh += (it.mh || 0);
            sum.sh += (it.sh || 0);
            return sum;
        }, {
            hh: 0, mh: 0, sh: 0
        })
    }, [itineraries])
    return (
        <>
            <GridItem colStart={3}>
                <Heading size="sm">Разом:</Heading>
            </GridItem>
            <GridItem><Heading textStyle="sm">{decimalToTimeString(hh)}</Heading></GridItem>
            <GridItem><Heading textStyle="sm">{decimalToTimeString(mh)}</Heading></GridItem>
            <GridItem><Heading textStyle="sm">{decimalToTimeString(sh)}</Heading></GridItem>
            <GridItem><Heading textStyle="sm">{decimalToTimeString(hours)}</Heading></GridItem>
            <GridItem><Heading textStyle="sm">{fuel}</Heading></GridItem>
        </>
    );
}

export default memo(Summary);