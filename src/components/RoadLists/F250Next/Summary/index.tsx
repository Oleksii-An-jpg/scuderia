'use client';
import {FC, memo, useMemo} from "react";
import {GridItem, Heading} from "@chakra-ui/react";
import {F250RoadListUIModel} from "@/models/mamba";

type SummaryProps = F250RoadListUIModel;

const Summary: FC<SummaryProps> = ({ itineraries, hours, fuel }) => {
    const total = useMemo(() => {
        return itineraries.reduce((sum, it) => {
            sum.t += (it.t || 0);
            sum['5%'] += (it['5%'] || 0);
            sum['10%'] += (it['10%'] || 0);
            sum['15%'] += (it['15%'] || 0);
            sum['4x4'] += (it['4x4'] || 0);
            return sum;
        }, {
            t: 0, '5%': 0, '10%': 0, '15%': 0, '4x4': 0
        })
    }, [itineraries])
    return (
        <>
            <GridItem colStart={3}>
                <Heading size="sm">Разом:</Heading>
            </GridItem>
            <GridItem><Heading textStyle="sm">{total.t}</Heading></GridItem>
            <GridItem><Heading textStyle="sm">{total['5%']}</Heading></GridItem>
            <GridItem><Heading textStyle="sm">{total['10%']}</Heading></GridItem>
            <GridItem><Heading textStyle="sm">{total['15%']}</Heading></GridItem>
            <GridItem><Heading textStyle="sm">{total['4x4']}</Heading></GridItem>
            <GridItem><Heading textStyle="sm">{hours}</Heading></GridItem>
            <GridItem><Heading textStyle="sm">{fuel}</Heading></GridItem>
        </>
    );
}

export default memo(Summary);