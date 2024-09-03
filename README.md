# Typhoon Test

[Typhoon Test](https://marketplace.visualstudio.com/items?itemName=balsabulatovic.tt-demo)
is an extension that is used to write, run python tests and display the result and log of each test,
using appropriate Typhoon API libraries.

When you install Typhoon Test, you get two main features:

- **API Wizard**: A tool which provides an easy way to add API commands
- **Pytest Monitor**: A tool which provides an easy way to run tests and monitor the results

## Features

### API Wizard

The API Wizard is a panel available in TyphoonTest IDE which provides a list of functions defined
in any python-importable module or class, and for any selected function users have quick access to
a formatted docstring and can easily add the function call with proper arguments

![API Wizard Demo](/assets/api-wizard-demo.gif)

The API Wizard panel is divided in 3 main parts

#### Function list

Contains all the found functions/methods in the selected library in a searchable list. 
The list also provides commands for importing python modules and classes (`typhoon-test.addPythonEntity`),
as well as saving the current workspace for future use (`typhoon-test.saveApiWizardWorkspace`).

![Function List](/assets/function-list.png)

#### Function documentation

Presents the HTML-formatted docstring of the selected function. Useful for knowing function arguments and other 
important information without having to open the documentation in a separate browser.

#### Function arguments

Provides an easy way of defining the function arguments and inserting them into your test code in the editor.
The unchanged default arguments can be omitted for a more concise test code and the function call can also be copied
to the clipboard and pasted in another editor/program.

### Pytest Monitor

Pytest Monitor provides a way to run tests and monitor the results in real-time.
The panel shows the test results in a tree view, where each test is represented by a node with a status icon.
The extension also provides a way to quick run a tests by executing the `typhoon-test.runTest` command.

![Pytest Monitor Demo](/assets/pytest-demo.gif)

Pytest Monitor creates a new output channel, **Pytest Output**, in the Output panel, where the test results are printed.
If the `typhoon-test.testRun.openReport` setting is enabled, the extension will create a new terminal **Allure Report**,
where the Allure server will be started and the test results will be displayed in a web browser.
If the `typhoon-test.testRun.pdfReport` will also generate a PDF report of the test results in the workspace directory.
Execution results will be stored in the `report` directory. If the `typhoon-test.testRun.cleanOldResults` setting is enabled,
the extension will clean the old results before new tests are run.

#### Extension Configuration

The extension needs to be configured in order to work properly. The configuration can be accessed by executing the
`typhoon-test.openTestRunConfiguration` command.

## Requirements

- Visual Studio Code v1.91.1 or higher
- Python 3.6 or higher (for running Python scripts)
- pytest 6.2.4 or higher (for running tests)
- Typhoon HIL (recommended for full usage of the extension)
