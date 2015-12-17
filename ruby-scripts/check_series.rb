#!/usr/bin/env ruby

if ARGV.size == 0
  abort("USAGE: #{__FILE__} <dir>");
end


Dir.glob("#{ARGV[0]}/*/Season*").each do |dir|
  max_ep=0
  count=0
  found=[]
  Dir.glob("#{dir}/*.{mkv,rar,mp4}") do |media|
    if media =~ /[. _](S([0-9]+)E([0-9]+)(?:(?:[.-]?E|&)([0-9]+))?|([0-9]+)x([0-9]+))[. _]/i
      eps = [$3, $4,$6].compact
      eps.each do |ep|
        if ep.to_i > 0
          max_ep = ep.to_i if ep.to_i > max_ep
          count += 1
          found << ep.to_i
        end
      end
    end
  end

  if count < max_ep
    puts "Serie missing episode: #{dir}"
    puts " --> Counted #{count} but max episode number is #{max_ep}"
    puts " --> Missing: #{((1..max_ep).step(1).to_a - found).join(', ')}"
    puts ""
    Dir.chdir(dir) do
      Dir["*.{mkv,rar,mp4}"].sort_by(&:downcase).each do |media|
        puts " + #{media}"
      end
    end
    puts "--------------------------------------"
  end
end

