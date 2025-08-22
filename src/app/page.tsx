'use client';
import {VStack, Card} from "@chakra-ui/react";
import Create from "@/components/Report/Create";
import {List} from "@/components/Report/List";

export default function Home() {
  return (
      <VStack align="stretch">
        <Create />
          <Card.Root>
              <Card.Header>
                  <List />
              </Card.Header>
          </Card.Root>
      </VStack>
  );
}
