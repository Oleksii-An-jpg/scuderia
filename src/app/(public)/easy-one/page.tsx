'use client';
import dynamic from 'next/dynamic';
import {Container, Tabs} from "@chakra-ui/react";
import {BiArea, BiMap} from "react-icons/bi";

const Generator = dynamic(() => import('../../../components/Generator'), {
    ssr: false
});

const Area = dynamic(() => import('../../../components/Area'), {
    ssr: false
});

export default function Page() {
    return <Container maxW="full">
        <Tabs.Root defaultValue="survey">
            <Tabs.List>
                <Tabs.Trigger value="survey">
                    <BiMap />
                    Survey Pattern Route Generator
                </Tabs.Trigger>
                <Tabs.Trigger value="area">
                    <BiArea />
                    Area Map File Generator
                </Tabs.Trigger>
            </Tabs.List>
            <Tabs.Content value="survey">
                <Generator />
            </Tabs.Content>
            <Tabs.Content value="area">
                <Area />
            </Tabs.Content>
        </Tabs.Root>
    </Container>
}