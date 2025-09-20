import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function Portfolio() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      {/* Header */}
      <header className="p-6 flex justify-between items-center shadow-md bg-white sticky top-0 z-10">
        <h1 className="text-2xl font-bold">My Portfolio</h1>
        <nav className="space-x-4">
          <a href="#about" className="hover:text-blue-500">About</a>
          <a href="#projects" className="hover:text-blue-500">Projects</a>
          <a href="#contact" className="hover:text-blue-500">Contact</a>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="flex flex-col items-center justify-center h-[70vh] text-center">
        <motion.h2 initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1 }}
          className="text-4xl md:text-6xl font-bold mb-4">
          Hi, I'm <span className="text-blue-500">Your Name</span>
        </motion.h2>
        <p className="text-lg md:text-xl mb-6">A passionate Software Engineer & Web Developer</p>
        <Button className="px-6 py-3 text-lg">Download Resume</Button>
      </section>

      {/* About Section */}
      <section id="about" className="p-10 max-w-4xl mx-auto text-center">
        <h3 className="text-3xl font-semibold mb-4">About Me</h3>
        <p className="text-gray-700 leading-relaxed">
          I am a Computer Science graduate with a strong passion for building web apps,
          mobile apps, and solving real-world problems with technology.
        </p>
      </section>

      {/* Projects Section */}
      <section id="projects" className="p-10 bg-gray-100">
        <h3 className="text-3xl font-semibold text-center mb-8">Projects</h3>
        <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
          <Card className="shadow-lg">
            <CardContent className="p-6">
              <h4 className="text-xl font-bold mb-2">Library Management System</h4>
              <p className="text-gray-600">Developed with Java & MySQL – includes login and CRUD features.</p>
            </CardContent>
          </Card>
          <Card className="shadow-lg">
            <CardContent className="p-6">
              <h4 className="text-xl font-bold mb-2">Portfolio Website</h4>
              <p className="text-gray-600">A personal website to showcase my skills and projects.</p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="p-10 max-w-3xl mx-auto text-center">
        <h3 className="text-3xl font-semibold mb-4">Contact</h3>
        <p className="mb-4">Feel free to reach out if you'd like to collaborate!</p>
        <a href="mailto:youremail@example.com" className="text-blue-500 font-medium hover:underline">
          youremail@example.com
        </a>
      </section>

      {/* Footer */}
      <footer className="p-6 text-center text-gray-500 text-sm">
        © {new Date().getFullYear()} Your Name. All rights reserved.
      </footer>
    </div>
  );
}
