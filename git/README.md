# gemdiff

    echo '*.gem diff=gemdiff' >> "$( git rev-parse --show-toplevel )/.gitattributes";
    git config diff.gemdiff.textconv=/path/to/gemdiff.sh

