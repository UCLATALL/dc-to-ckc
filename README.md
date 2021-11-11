# dc-to-ckc
Convert DataCamp Exercises to CKCode exercises

## Installation

This package is not published anywhere but GitHub. To install, you need `git`, `node`, and `npm` installed.

```bash
git clone https://github.com/UCLATALL/dc-to-ckc
cd dc-to-ckc
npm i -g .
```

## Usage

You can get the current version and help documentation just like other CLI tools:

```bash
dc-to-ckc --help
dc-to-ckc --version
```

To run the conversion script, use the following code (note that the directories can be specified either relatively or absolutely):

```bash
dc-to-ckc convert [book pages dir] [datacamp html dir] [output dir]

# convert is the default command, so this is equivalent:
dc-to-ckc [book pages dir] [datacamp html dir] [output dir]
```

**Note:** By design, there are no checks on overwriting files. So, if you specify the `book pages dir` the same as the `output dir`, the files will be overwritten. This is useful for converting files in-place.
