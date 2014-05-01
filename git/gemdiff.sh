#!/bin/bash

echo "============== metadata =============="
tar -xOf $1 metadata.gz 2>/dev/null | gunzip -c 2>/dev/null
echo "============== checksums ============="
tar -xOf $1 checksums.yaml.gz 2>/dev/null | gunzip -c 2>/dev/null
echo "=============== files ================"
tar -xOf $1 data.tar.gz 2>/dev/null | tar -xvOzf - 2>&1
