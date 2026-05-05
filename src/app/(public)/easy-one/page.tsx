'use client';
import dynamic from 'next/dynamic';
import {Container, Tabs} from "@chakra-ui/react";
import {BiArea, BiMap} from "react-icons/bi";

const IDGenerator = dynamic(() => import('../../../components/Generator/id'), {
    ssr: false
});

// const SearchGenerator = dynamic(() => import('../../../components/Generator/search'), {
//     ssr: false
// });

const Area = dynamic(() => import('../../../components/Area'), {
    ssr: false
});

const Validator = dynamic(() => import('../../../components/Validator'), {
    ssr: false
})

export default function Page() {
    return <Container maxW="full">
        <Tabs.Root defaultValue="id">
            <Tabs.List>
                <Tabs.Trigger value="id">
                    <BiMap />
                    ID Mission Survey Pattern Route Generator
                </Tabs.Trigger>
                <Tabs.Trigger value="search" disabled>
                    <BiMap />
                    Search Mission Survey Pattern Route Generator
                </Tabs.Trigger>
                <Tabs.Trigger value="area">
                    <BiArea />
                    Area Map File Generator
                </Tabs.Trigger>
                <Tabs.Trigger value="validator">
                    <BiArea />
                    Mission plan Validator
                </Tabs.Trigger>
            </Tabs.List>
            <Tabs.Content value="search">
                {/*<SearchGenerator />*/}
            </Tabs.Content>
            <Tabs.Content value="id">
                <IDGenerator />
            </Tabs.Content>
            <Tabs.Content value="area">
                <Area />
            </Tabs.Content>
            <Tabs.Content value="validator">
                <Validator />
            </Tabs.Content>
        </Tabs.Root>
    </Container>
}