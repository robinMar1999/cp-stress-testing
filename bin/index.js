#!/usr/bin/env node

import { error, log } from 'console';
import util from 'util';
import fs from 'fs';
import path from 'path';
import { exit } from 'process';
import { exec } from 'child_process';

const execAsync = util.promisify(exec);
const readFileAsync = util.promisify(fs.readFile)
const writeFileAsync = util.promisify(fs.writeFile);
const setTimeOutAsync = util.promisify(setTimeout)
const fileAccessAsync = util.promisify(fs.access)

const writeFile = async (path, data) => {
  try {
    await writeFileAsync(path, data, 'utf-8');
  } catch (error) {
    console.error('An error occurred:', error);
  }
}

const checkIfFileExists = async (filePath) => {
    try {
        await fileAccessAsync(filePath, fs.constants.F_OK)
        log("File found: ", filePath)
    } catch (err) {
        error("File does not exists: ", filePath)
        exit()
    }
}

const execCommand = async command => {
    try {
        await execAsync(command);
    } catch (error) {
        console.error('Error:', error);
    }
}

const readFile = async filePath => {
    try {
        const data = await readFileAsync(filePath, 'utf-8');
        return data;
      } catch (error) {
        console.error('An error occurred:', error);
      }
}

const sleep = async ms => {
    await setTimeOutAsync(ms)
}

const closeTerminalAfter = async ms => {
    await sleep(ms)
    const terminalWindowName = "Stress Testing C++"

    const closeTerminalCommand = `
    osascript -e 'tell application "Terminal"
        set windowsToClose to {}
        repeat with currentWindow in windows
        if name of currentWindow contains "${terminalWindowName}" then
            set end of windowsToClose to currentWindow
        end if
        end repeat
        
        repeat with windowToClose in windowsToClose
        activate
        close windowToClose
        end repeat
    end tell'`;
    await execCommand(closeTerminalCommand)
}


const main = async () => {
    const inputFilePath = process.argv[2]
    const filePattern = /(.+)\/(.+).cpp/
    const folder = inputFilePath.match(filePattern)[1]
    const fileName = inputFilePath.match(filePattern)[2]
    const goodFilePath = path.join(folder, `${fileName}__Good.cpp`)
    const generatorFilePath = path.join(folder, `${fileName}__Generator.cpp`)
    const randomInputFilePath = path.join(folder, `${fileName}__Random__Input.txt`)
    const outputFilePath = path.join(folder, `${fileName}__Output.txt`)
    const goodOutputFilePath = path.join(folder, `${fileName}__Good__Output.txt`)
    const comparisonFilePath = path.join(folder, `${fileName}__Comparison.txt`)

    await checkIfFileExists(inputFilePath)
    await checkIfFileExists(goodFilePath)
    await checkIfFileExists(generatorFilePath)

    const commandGenerateInputExec = `g++-12 -DLOCAL -std=c++20 "${generatorFilePath}" -o "${folder}/${fileName}__Generator"`
    const commandGoodOutputExec = `g++-12 -DLOCAL -std=c++20 \"${goodFilePath}\" -o \"${folder}/${fileName}__Good\"`
    const commandOutputExec = `g++-12 -DLOCAL -std=c++20 \"${inputFilePath}\" -o \"${folder}/${fileName}\"`
    await execCommand(commandGenerateInputExec)
    await execCommand(commandGoodOutputExec)
    await execCommand(commandOutputExec)

    let hasOpenedComparisonFile = false

    for(let i = 0; i < Infinity; i++) {
        const commandGenerateInput = `"${folder}/${fileName}__Generator" <input.txt >${randomInputFilePath}`
        const commandGoodOutput = `"${folder}/${fileName}__Good" <${randomInputFilePath} >${goodOutputFilePath}`
        const commandOutput = `"${folder}/${fileName}" <${randomInputFilePath} >${outputFilePath}`
        await execCommand(commandGenerateInput)
        await execCommand(commandGoodOutput)
        await execCommand(commandOutput)

        const output = await readFile(outputFilePath)
        const goodOutput = await readFile(goodOutputFilePath)
        const input = await readFile(randomInputFilePath)

        const linesToWrite = []

        linesToWrite.push(`Test Case #${i+1}`)
        linesToWrite.push("")
        linesToWrite.push("")
        linesToWrite.push("")
        linesToWrite.push("Input:")
        linesToWrite.push("========")
        linesToWrite.push(input)
        linesToWrite.push("")
        linesToWrite.push("")
        linesToWrite.push("Output:")
        linesToWrite.push("========")
        linesToWrite.push(output)
        linesToWrite.push("")
        linesToWrite.push("")
        linesToWrite.push("Good Output:")
        linesToWrite.push("=============")
        linesToWrite.push(goodOutput)
        linesToWrite.push("")
        linesToWrite.push("")

        let mismatch = false;

        if(output !== goodOutput) {
            error("Found bad output")
            linesToWrite.push("Mismatch Found!")
            mismatch = true;
        } else {
            linesToWrite.push("Output Matching")
        }
        
        linesToWrite.push("")
        linesToWrite.push("")

        const comparisonData = linesToWrite.join("\n")
        await writeFile(comparisonFilePath, comparisonData)
        if(!hasOpenedComparisonFile) {
            const openComparisonFileCommand = `subl --add ${comparisonFilePath}`
            await execCommand(openComparisonFileCommand)
            hasOpenedComparisonFile = true;
        }
        
        await sleep(500)

        if(mismatch)
            break;
    }

    await closeTerminalAfter(3000)
}

main();

// we will have three files in this location fileName.cpp, fileName__Good.cpp, fileName__Generator.cpp






