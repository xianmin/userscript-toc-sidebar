// ==UserScript==
// @name         TOC Sidebar
// @author       xianmin
// @namespace    https://www.xianmin.org
// @version      1.1
// @description  Press 't' to toggle the TOC sidebar
// @match        *://*/*
// @grant        GM_addStyle
// @grant        GM.registerMenuCommand
// @icon              https://raw.githubusercontent.com/xianmin/userscript-toc-sidebar/master/icon.svg
// @homepageURL       https://github.com/xianmin/userscript-toc-sidebar
// @downloadURL       https://raw.githubusercontent.com/xianmin/userscript-toc-sidebar/master/toc-sidebar.user.js
// @license        GPLv3 License
// ==/UserScript==

(function () {
  'use strict';

  // Add keyboard shortcut listener
  function addKeyboardShortcut() {
    document.addEventListener('keydown', function (e) {
      // Check if the pressed key is 't' and no modifier keys are pressed
      if (e.key === 't' && !e.ctrlKey && !e.altKey && !e.metaKey) {
        // Prevent default action if the active element is not an input or textarea
        if (document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
          e.preventDefault();
          e.stopPropagation();
          toggleSidebar();
        }
      }
    }, true);
  }

  // Add CSS styles
  GM_addStyle(`
        #xmtoc-outline-sidebar {
            display: flex;
            flex-direction: column;
            font-family: Arial, sans-serif;
            font-size: 14px;
            line-height: 1.5;
            color: #333;
            background-color: #f8f8f8;
            border-right: 1px solid #e0e0e0;
            overflow-y: auto;
            overflow-x: hidden;
            box-shadow: 2px 0 5px rgba(0,0,0,0.1);
            min-width: 200px;
            max-width: 50vw;
            position: fixed;
            left: 0;
            top: 0;
            height: 100%;
            z-index: 9999;
            transition: transform 0.3s ease-in-out;
            transform: translateX(-100%);
        }

        #xmtoc-outline-sidebar ul {
            margin: 0;
            padding-left: 20px;
        }

        #xmtoc-outline-sidebar li {
            margin: 8px 0;
            list-style-type: none;
        }

        #xmtoc-outline-sidebar a {
            color: #2c3e50;
            text-decoration: none;
            transition: color 0.2s ease;
        }

        #xmtoc-outline-sidebar a:hover {
            color: #3498db;
        }

        #xmtoc-outline-sidebar span {
            display: inline-block;
            text-align: center;
            background-color: #e0e0e0;
            border-radius: 2px;
            margin-right: 8px;
            font-size: 12px;
            cursor: pointer;
            transition: background-color 0.2s ease;
        }

        #xmtoc-outline-sidebar span:hover {
            background-color: #d0d0d0;
        }

        #xmtoc-outline-sidebar li > ul {
            border-left: 1px solid #e0e0e0;
            margin-left: 8px;
            padding-left: 12px;
        }

        #xmtoc-outline-sidebar a.active {
            font-weight: bold;
            color: #3498db;
        }

        #xmtoc-sidebar-resize-handle {
            position: absolute;
            right: 0;
            top: 0;
            bottom: 0;
            width: 10px;
            background-color: transparent;
            cursor: ew-resize;
            z-index: 10000;
        }

        #xmtoc-sidebar-resize-handle::after {
            content: '';
            position: absolute;
            top: 0;
            bottom: 0;
            right: 0;
            width: 2px;
            background-color: #e0e0e0;
            transition: background-color 0.2s ease;
        }

        #xmtoc-sidebar-resize-handle:hover::after {
            background-color: #3498db;
        }

        #xmtoc-resize-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: transparent;
            z-index: 9999;
        }

        #xmtoc-outline-sidebar > ul {
            padding: 10px;
            padding-right: 20px;
            flex-grow: 1;
            overflow-y: auto;
        }

        #xmtoc-sidebar-title-bar {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px;
            background-color: #e0e0e0;
            border-bottom: 1px solid #ccc;
            height: 30px;
            position: sticky;
            top: 0;
            z-index: 1;
        }

        .xmtoc-sidebar-title {
            font-weight: bold;
        }

        .xmtoc-sidebar-button-container {
            display: flex;
            align-items: center;
        }

        .xmtoc-sidebar-button {
            background-color: #f8f8f8;
            border: 1px solid #ccc;
            border-radius: 3px;
            padding: 2px 6px;
            margin-left: 5px;
            cursor: pointer;
            font-size: 12px;
        }

        .xmtoc-sidebar-button:hover {
            background-color: #e0e0e0;
        }

        #xmtoc-sidebar-close-button:hover {
            color: #e74c3c;
        }
    `);

  let sidebarVisible = false;
  let headingsMap = new Map();
  let isResizing = false;
  let lastDownX = 0;
  let resizeOverlay;

  // Create the sidebar element
  function createSidebar() {
    const sidebar = document.createElement('div');
    sidebar.id = 'xmtoc-outline-sidebar';
    sidebar.style.position = 'fixed';
    sidebar.style.left = '0';
    sidebar.style.top = '0';
    sidebar.style.width = '250px';
    sidebar.style.height = '100%';
    sidebar.style.zIndex = '9999';
    sidebar.style.transition = 'transform 0.3s ease-in-out';
    sidebar.style.transform = 'translateX(-100%)';

    // Create title bar
    const titleBar = document.createElement('div');
    titleBar.id = 'xmtoc-sidebar-title-bar';

    const title = document.createElement('div');
    title.textContent = 'TOC';
    title.className = 'xmtoc-sidebar-title';
    titleBar.appendChild(title);

    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'xmtoc-sidebar-button-container';

    const expandButton = document.createElement('div');
    expandButton.textContent = '+';
    expandButton.className = 'xmtoc-sidebar-button xmtoc-expand-button';
    expandButton.onclick = expandAll;

    const collapseButton = document.createElement('div');
    collapseButton.textContent = '-';
    collapseButton.className = 'xmtoc-sidebar-button xmtoc-collapse-button';
    collapseButton.onclick = collapseAll;

    // Create close button
    const closeButton = document.createElement('div');
    closeButton.id = 'xmtoc-sidebar-close-button';
    closeButton.className = 'xmtoc-sidebar-button xmtoc-close-button';
    closeButton.textContent = 'X';
    closeButton.onclick = closeSidebar;

    buttonContainer.appendChild(expandButton);
    buttonContainer.appendChild(collapseButton);
    buttonContainer.appendChild(closeButton);
    titleBar.appendChild(buttonContainer);

    sidebar.appendChild(titleBar);

    // Add resize handle
    const resizeHandle = document.createElement('div');
    resizeHandle.id = 'xmtoc-sidebar-resize-handle';
    sidebar.appendChild(resizeHandle);

    document.body.appendChild(sidebar);

    // Create resize overlay
    resizeOverlay = document.createElement('div');
    resizeOverlay.id = 'xmtoc-resize-overlay';
    resizeOverlay.style.display = 'none';
    document.body.appendChild(resizeOverlay);

    // Add resize event listeners
    resizeHandle.addEventListener('mousedown', initResize, false);

    return sidebar;
  }

  // Close the sidebar
  function closeSidebar() {
    toggleSidebar();
  }

  // Initialize resize functionality
  function initResize(e) {
    isResizing = true;
    lastDownX = e.clientX;

    document.addEventListener('mousemove', resize, false);
    document.addEventListener('mouseup', stopResize, false);

    resizeOverlay.style.display = 'block';
    document.body.style.userSelect = 'none';
  }

  // Resize the sidebar
  function resize(e) {
    if (!isResizing) return;

    const sidebar = document.getElementById('xmtoc-outline-sidebar');
    let newWidth = parseInt(sidebar.style.width) + (e.clientX - lastDownX);

    const minWidth = 200;
    const maxWidth = window.innerWidth / 2;
    newWidth = Math.max(minWidth, Math.min(newWidth, maxWidth));

    sidebar.style.width = newWidth + 'px';
    document.body.style.marginLeft = newWidth + 'px';

    lastDownX = e.clientX;
  }

  // Stop resizing
  function stopResize() {
    isResizing = false;
    document.removeEventListener('mousemove', resize, false);
    document.removeEventListener('mouseup', stopResize, false);

    resizeOverlay.style.display = 'none';
    document.body.style.userSelect = '';
  }

  // Generate the outline
  function generateOutline() {
    const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'));
    const outline = document.createElement('ul');
    outline.style.listStyleType = 'none';
    outline.style.padding = '10px';

    const headingStack = [{ level: 0, element: outline }];
    headingsMap.clear();

    // Filter headings
    function filterHeadings(headings) {
      const contentArea = findContentArea();
      return headings.filter(heading => {
        if (contentArea && !contentArea.contains(heading)) {
          return false;
        }
        if (heading.closest('nav, header, footer')) {
          return false;
        }
        if (heading.offsetParent === null || heading.textContent.trim() === '') {
          return false;
        }
        return true;
      });
    }

    // Find the main content area
    function findContentArea() {
      const possibleContentSelectors = ['article', 'main', '.content', '#content', '.post', '#post'];
      for (let selector of possibleContentSelectors) {
        const element = document.querySelector(selector);
        if (element) return element;
      }
      return null;
    }

    const filteredHeadings = filterHeadings(headings);

    filteredHeadings.forEach((heading, index) => {
      const level = parseInt(heading.tagName.charAt(1));
      const listItem = document.createElement('li');
      const link = document.createElement('a');
      link.textContent = heading.textContent;
      link.href = '#';
      link.onclick = (e) => {
        e.preventDefault();
        heading.scrollIntoView({ behavior: 'smooth' });
      };

      headingsMap.set(heading, { link, level, index });

      while (level <= headingStack[headingStack.length - 1].level) {
        headingStack.pop();
      }

      const currentList = headingStack[headingStack.length - 1].element;
      if (level > headingStack[headingStack.length - 1].level || (level === 2 && headingStack[headingStack.length - 1].level === 0)) {
        const newList = document.createElement('ul');
        newList.style.listStyleType = 'none';
        newList.style.paddingLeft = level === 1 ? '0' : '20px';
        newList.style.display = level === 1 ? 'block' : 'none';

        const hasSubheadings = level !== 1 && filteredHeadings[index + 1] && parseInt(filteredHeadings[index + 1].tagName.charAt(1)) > level;

        if (hasSubheadings) {
          const toggleButton = document.createElement('span');
          toggleButton.textContent = '▶';
          toggleButton.style.cursor = 'pointer';
          toggleButton.style.marginRight = '5px';
          toggleButton.onclick = (e) => {
            e.stopPropagation();
            newList.style.display = newList.style.display === 'none' ? 'block' : 'none';
            toggleButton.textContent = newList.style.display === 'none' ? '▶' : '▼';
          };
          listItem.appendChild(toggleButton);
        }

        listItem.appendChild(link);
        listItem.appendChild(newList);
        currentList.appendChild(listItem);
        headingStack.push({ level, element: newList });
      } else {
        listItem.appendChild(link);
        currentList.appendChild(listItem);
      }
    });

    return outline;
  }

  // Toggle sidebar visibility
  function toggleSidebar() {
    const sidebar = document.getElementById('xmtoc-outline-sidebar') || createSidebar();
    sidebarVisible = !sidebarVisible;

    if (sidebarVisible) {
      sidebar.style.transform = 'translateX(0)';
      document.body.style.marginLeft = sidebar.style.width;

      if (!sidebar.querySelector('ul')) {
        const titleBar = sidebar.querySelector('#xmtoc-sidebar-title-bar');
        const outline = generateOutline();

        sidebar.innerHTML = '';
        sidebar.appendChild(titleBar);
        sidebar.appendChild(outline);

        const resizeHandle = document.createElement('div');
        resizeHandle.id = 'xmtoc-sidebar-resize-handle';
        sidebar.appendChild(resizeHandle);
        resizeHandle.addEventListener('mousedown', initResize, false);

        setupIntersectionObserver();
      }
    } else {
      sidebar.style.transform = 'translateX(-100%)';
      document.body.style.marginLeft = '0';
    }
  }

  // Set up intersection observer for active heading tracking
  function setupIntersectionObserver() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          updateActiveHeading(entry.target);
        }
      });
    }, { threshold: 0.1 });

    headingsMap.forEach((value, heading) => {
      observer.observe(heading);
    });
  }

  // Update the active heading in the sidebar
  function updateActiveHeading(visibleHeading) {
    let activeHeading = visibleHeading;
    const visibleHeadingData = headingsMap.get(visibleHeading);

    headingsMap.forEach((data, heading) => {
      if (heading.getBoundingClientRect().top <= 0 && data.index > headingsMap.get(activeHeading).index) {
        activeHeading = heading;
      }
    });

    headingsMap.forEach(data => data.link.classList.remove('active'));

    let currentHeading = activeHeading;
    while (currentHeading) {
      const data = headingsMap.get(currentHeading);
      data.link.classList.add('active');
      currentHeading = findParentHeading(currentHeading);
    }
  }

  // Find the parent heading of a given heading
  function findParentHeading(heading) {
    const currentLevel = parseInt(heading.tagName.charAt(1));
    let currentHeading = heading;

    while (currentHeading) {
      currentHeading = currentHeading.previousElementSibling;
      if (currentHeading && parseInt(currentHeading.tagName.charAt(1)) < currentLevel) {
        return currentHeading;
      }
    }

    return null;
  }

  // Expand all headings
  function expandAll() {
    const sidebar = document.getElementById('xmtoc-outline-sidebar');
    if (!sidebar) return;

    const toggleButtons = sidebar.querySelectorAll('span');
    toggleButtons.forEach(button => {
      const newList = button.nextElementSibling.nextElementSibling;
      if (newList) {
        newList.style.display = 'block';
        button.textContent = '▼';
      }
    });
  }

  // Collapse all headings
  function collapseAll() {
    const sidebar = document.getElementById('xmtoc-outline-sidebar');
    if (!sidebar) return;

    const toggleButtons = sidebar.querySelectorAll('span');
    toggleButtons.forEach(button => {
      const newList = button.nextElementSibling.nextElementSibling;
      if (newList) {
        newList.style.display = 'none';
        button.textContent = '▶';
      }
    });
  }

  // Initialize
  function initialize() {
    addKeyboardShortcut();
  }

  // Call initialize
  initialize();

  // Add menu button
  GM.registerMenuCommand('Toggle TOC', toggleSidebar)
})();
