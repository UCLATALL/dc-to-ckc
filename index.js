#! /usr/bin/env node

const fs = require("fs");
const path = require("path");

const dedent = require("dedent");
const jsdom = require("jsdom");

require("yargs")
  .scriptName("dc-to-ckc")
  .usage("$0 <cmd> [args]")
  .command(
    "convert [src] [dc] [dest]",
    "Extract the code modules from the DataCamp HTML files in `datacamp`, convert them " +
      "to CKCode markdown, replace the iframe in the `src` markdown files with the CKCode " +
      "markdown, and output new markdown files to `dest`. The replacements are performed by " +
      "matching the HTML ID of the iframe in `src` to a filename in `dc`.",
    (yargs) => {
      yargs.positional("src", {
        type: "string",
        default: ".",
        describe:
          "The directory containing markdown pages referencing DataCamp exercises.",
      });

      yargs.positional("dc", {
        type: "string",
        default: ".",
        describe: "The directory containing the referenced DataCamp exercises.",
      });

      yargs.positional("dest", {
        type: "string",
        default: "./converted",
        describe: "The directory to output the converted files to.",
      });
    },
    (argv) => {
      convert(argv["src"], argv["dc"], argv["dest"]);
    }
  )
  .help().argv;

/**
 * Handler for the `convert` command.
 *
 * Converts all DataCamp iframe references into CKCode markdown specification. Extracts the code
 * modules from the DataCamp HTML files in `datacamp`, convert them to CKCode markdown, replace the
 * iframe in the `src` markdown files with the CKCode markdown, and output new markdown files to
 * `dest`. The replacements are performed by matching the HTML ID of the iframe in `src` to a
 * filename in `dc`.
 *
 * @param {string} book_dir The directory containing markdown pages referencing DataCamp exercises.
 * @param {string} datacamp_dir The directory containing the referenced DataCamp exercises.
 * @param {string} output_dir The directory to output the converted files to.
 */
function convert(book_dir, datacamp_dir, output_dir) {
  const chapter_dirs = fs
    .readdirSync(book_dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);

  const dc_map = Object.fromEntries(
    ls_recursive(datacamp_dir).map((file) => [
      path.basename(file, ".html"),
      file,
    ])
  );

  chapter_dirs.forEach((chapter_dir) => {
    const chapter_output_dir = path.join(output_dir, chapter_dir);
    if (!fs.existsSync(chapter_output_dir)) {
      fs.mkdirSync(chapter_output_dir, { recursive: true });
    }

    const file_names = fs
      .readdirSync(path.join(book_dir, chapter_dir))
      .filter((file) => path.extname(file).toLowerCase() === ".md");

    file_names.forEach((file_name) => {
      const file = path.join(book_dir, chapter_dir, file_name);
      const iframe_pattern =
        /(<.*?p.*?>)?<iframe.+?data-type="?datacamp"?.*?>.*?<\/iframe>(<\/p>)?/gi;
      const new_contents = fs
        .readFileSync(file)
        .toString()
        .replaceAll(iframe_pattern, (html_str) => {
          const page_dom = new jsdom.JSDOM(html_str);
          const iframe = page_dom.window.document.querySelector("iframe");
          const replacement_file = dc_map[iframe.id];
          return dc2md_code_cell(replacement_file, iframe.id);
        });

      fs.writeFileSync(path.join(chapter_output_dir, file_name), new_contents);
    });
  });
}

/**
 * Convert a DataCamp HTML specification into a CodeCell specification using markdown syntax.
 * @param {string} file An HTML file containing a single DataCamp exercise.
 * @param {string} id The HTML ID to use in the output specification.
 * @return {string}
 */
function dc2md_code_cell(file, id) {
  const datacamp_contents = fs.readFileSync(file).toString();
  const datacamp_dom = new jsdom.JSDOM(datacamp_contents);
  const module = datacamp_dom.window.document.querySelector(
    "[data-datacamp-exercise]"
  );
  const code = {
    setup: module.querySelector("[data-type=pre-exercise-code]")?.textContent,
    prompt: module.querySelector("[data-type=sample-code]")?.textContent,
    solution: module.querySelector("[data-type=solution]")?.textContent,
    test: module.querySelector("[data-type=sct]")?.textContent,
  };

  // start a fenced code block with attributes
  let md_code_cell = `\`\`\`{ data-ckcode=true #${id} }\n`;

  // fill the block with the code parts
  Object.entries(code).forEach((entry) => {
    const [key, value] = entry;
    if (value) {
      md_code_cell += `%%% ${key.toLowerCase()}\n`;
      md_code_cell += `${dedent(value)}\n\n`;
    }
  });

  // trim extra new line and close fenced code block
  return md_code_cell.replace(/\n\n$/, "\n```");
}

/**
 * Get all files in the given directory, recursively.
 * @param {string} dir_path The path to search.
 * @param {string[]} files_accumulator The files already found (used by the function itself).
 * @return {string[]}
 */
function ls_recursive(dir_path, files_accumulator = []) {
  const files = fs.readdirSync(dir_path);
  files.forEach(function (file) {
    if (fs.statSync(dir_path + "/" + file).isDirectory()) {
      files_accumulator = ls_recursive(
        path.join(dir_path, file),
        files_accumulator
      );
    } else {
      files_accumulator.push(path.join(__dirname, dir_path, "/", file));
    }
  });

  return files_accumulator;
}
