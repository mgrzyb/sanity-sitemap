import React, {useEffect, useState} from "react";
import {Autocomplete, Box, Button, Card, Dialog, Flex, Text} from "@sanity/ui";

export const SelectCollectionTypeDialog = ({availableTypes, onSelect, onClose}: {
  availableTypes: readonly string[],
  onSelect: (type: string) => void,
  onClose: () => void
}) => {
  const [value, setValue] = useState<string | undefined>(undefined);

  return (
    <Dialog id={'fafarafa'} onClose={onClose}>
      <Autocomplete id={'dudud'}
                    options={availableTypes.map(t => ({ value: t }))}
                    openButton
                    renderOption={(option) => (
                      <Card as="button">
                        <Flex align="center">
                          <Box flex={1} padding={3}>
                            <Text size={[2, 2, 3]}>
                              {option.value}
                            </Text>
                          </Box>
                        </Flex>
                      </Card>
                    )}
                    value={value}
                    onChange={v => setValue(v)}/>
      <Button disabled={!value} onClick={() => {
        onSelect(value!);
        onClose();
      }}>Select</Button>
    </Dialog>);
};
