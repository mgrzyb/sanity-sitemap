import {useClient} from "sanity";
import React, {useEffect, useState} from "react";
import {Autocomplete, Box, Button, Card, Dialog, Flex, Text} from "@sanity/ui";

import {SitemapTreeNode} from "./SitemapTreeNode";
import {SitemapPage} from "./SitemapPage";

export const SelectPageDialog = ({pageTypes, onSelect, onClose}: {
  pageTypes: string[],
  onSelect: (page: SitemapPage) => void,
  onClose: () => void
}) => {
  const client = useClient({apiVersion: "2021-06-07"});
  const [value, setValue] = useState<string | undefined>(undefined);
  const [pages, setPages] = useState<any[] | undefined>(undefined);
  useEffect(() => {
    client.fetch(`*[_type in $types] { _id, _type, "slug": slug.current, title }`, { types: pageTypes }, {perspective: "previewDrafts"}).then(documents => {
      setPages(documents.map((d: any) => ({value: d._id, type: d._type, title: d.title})));
    })
  }, []);

  return (
    <Dialog id={'fafarafa'} onClose={onClose}>
      <Autocomplete id={'dudud'}
                    loading={pages === undefined}
                    options={pages}
                    openButton
                    filterOption={(query, option: any) =>
                      option.title
                        .toLowerCase()
                        .indexOf(query.toLowerCase()) > -1
                    }
                    renderValue={(value, option: any) => option?.title}
                    renderOption={(option) => (
                      <Card as="button">
                        <Flex align="center">
                          <Box flex={1} padding={3}>
                            <Text size={[2, 2, 3]}>
                              {option.title}
                            </Text>
                          </Box>
                        </Flex>
                      </Card>
                    )}
                    value={value}
                    onChange={v => setValue(v)}/>
      <Button disabled={!value} onClick={() => {
        const page = pages?.find(p => p.value === value);
        onSelect({id: value!, type: page?.type, slug: page.slug, title: page?.title});
        onClose();
      }}>Select</Button>
    </Dialog>);
};
