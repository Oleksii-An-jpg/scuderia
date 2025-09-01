'use client';
import {Container} from "@chakra-ui/react";
import RoadLists from "@/components/RoadLists";
import {Suspense} from "react";

export default function Home() {
    return (
        <Container>
            <Suspense fallback={null}>
                <RoadLists />
            </Suspense>
        </Container>
    );
}
