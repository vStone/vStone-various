# Prompt enhancements

2 of these files are ment to enhance your prompt command:
* bashrc_svn: Provides basic svn branch/revision/dirty state information
              for a svn repository. Requires svn obviously.
* bashrc_git: EXTENDS the git prompt by adding remotes to the game.
              This is not a stand alone solution, you need the upstream
              git prompt script too.

## bashrc_svn

To use: install this script somewhere and source it from your bashrc.
A example prompt will be set by default but this can be overwritten in your
bashrc file.

Quick install:
```
wget https://raw.github.com/vStone/vStone-various/master/bash-scripts/bashrc_svn -O ~/.bashrc_svn
echo 'source ~/.bashrc_svn' >> ~/.bashrc
# The example prompt:
tail -n 5 ~/.bashrc_svn | grep ^PS1
```

## bashrc_git

Adds remotes support. Quick install is pretty much the same as the svn one but
you MUST have git prompt support in place already. You can check by running
__git_ps1 and see if you get a 'command not found'.


## combined git and svn prompt

An example can be found in bashrc_prompt.
